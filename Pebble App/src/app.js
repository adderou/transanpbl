// Requires
var ajax = require('ajax');
var UI = require('ui');
var Settings = require('settings');

//Inicialización de globales
var pos = {lat:0,long:0};
var baseURL = 'http://dev.adderou.cl/transanpbl/busdata.php?paradero=';
var apiKey = "AIzaSyDFxEVKnPKStiQoLMU0xm0ASXPfTzcmTno";
var misParaderos;
var pos={lat:null,long:null};

//Inicialización de SplashWindows:

var splashCardLocation = new UI.Card({
				icon:'images/posicion.png',
				title: 'TransanPbl',
				subtitle: 'Localizando...',
				body: "Determinando coords. con el móvil"
			});

var splashCardErrorSaved = new UI.Card({
				icon:'images/error.png',
				title: 'Error',
				subtitle: 'Sin Paraderos',
				body: "Agrega paraderos desde la config del móvil."
			});

var splashCardErrorParadero = new UI.Card({
				icon:'images/error.png',
				title: 'Error',
				subtitle: 'Paradero Inexistente',
				body: "Revisa ID de paradero y reintenta."
			});

var splashCardErrorLocation = new UI.Card({
				icon:'images/error.png',
				title: 'Error',
				subtitle: 'Ubicación no disponible',
				body: "Activa Servicio Ubicación en móvil."
			});

var splashCardNoneLocation = new UI.Card({
				icon:'images/error.png',
				title: 'Error',
				subtitle: 'No hay paraderos cercanos',
				body: "¿Estás en Santiago?"
			});
var splashCardAbout = new UI.Card({
				icon:'images/logoadderou.png',
				title: 'Adderou',
				subtitle: 'TransanPbl V2',
				body: "Consultas, reportes, felicitaciones y quejas a dev@adderou.cl \n"
			});



//Función para conseguir paraderos

var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 10000, 
  timeout: 10000
};

//Configuración de Opciones Web:
Settings.config(
  { url: 'http://dev.adderou.cl/transanpbl/'},
  function(e) {
    console.log('Abriendo Opciones web');
    console.log("Opciones web actuales: "+JSON.stringify(e.options));
  },
  function(e) {
    console.log('Cerrando las opciones web');
    console.log("Opciones web modificadas: "+JSON.stringify(e.options));
    if (e.failed) {
      console.log(e.response);
    }
  }
);

//Entregar lista de buses.
var listaBuses = function(data) {
  var items = [];
  for(var i = 0; i < data.servicios.length;i++) {
    var subtitulo;
    var actual = data.servicios[i];
    var servicio = actual.servicio;
    var esValido = actual.valido;
    var patente = "";
    if (esValido=='0') {
      subtitulo=actual.descripcionError;
    } else {
      subtitulo="A "+actual.distancia;
      patente = " - " +actual.patente;
    }
    items.push({
      title:servicio+patente,
      subtitle:subtitulo
    });
  }
  return items;
};


//Mostrar paraderos guardados actualmente
console.log("Configuraciones actuales: " +JSON.stringify(Settings.option()));


//Devuelve los paraderos como una lista
var paraderosGuardados = function() {
  var misParaderos = Settings.option();
  var i=0;
  var listaParaderos = [];
  while (misParaderos[""+i].Paradero!=="") {
    var paraderoActual = {
      title:misParaderos[""+i].Paradero,
      subtitle:misParaderos[""+i].Descripcion
    };
    listaParaderos.push(paraderoActual);
    i++;
  }
  if (listaParaderos.length===0 || listaParaderos===undefined) {
    listaParaderos = null;
  }
  return listaParaderos; 
};

//Devuelve los paraderos como una lista
var paraderosCercanos = function(lat,long) {
	var listaParaderos = [];
	ajax (
			{
				url: "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="+lat+","+long+"&sensor=true&key="+apiKey+"&rankby=distance&types=bus_station",
        type: 'json',
				async: false
      },
      function(data) {
				var cercanos = data.results;
				for (var i=0;i<cercanos.length;i++) {
					console.log(JSON.stringify(i+": "+cercanos[i].name));
					var parada = cercanos[i].name.split(" - ");
					listaParaderos.push({
						title:parada[0],
						subtitle:parada[1],
					});
				}
			}, function (error) {
				console.log("No se pudo obtener paraderos: "+error);
			}
	);
	console.log("Paraderos obtenidos post ajax: "+JSON.stringify(listaParaderos));
	if (listaParaderos.length===0) {
		listaParaderos=null;
	}
	return listaParaderos; 
};

//Función de muestra de paraderos y recorridos. Recibe lista con paraderos.

function mostrarListaParaderos() {
	var menuParaderos = new UI.Menu({
						sections: [{
							title: "Paraderos",
							items: misParaderos
						}]
		});
		menuParaderos.show();
			menuParaderos.on('select',function(e) {
				var paradero = misParaderos[e.itemIndex].title;
				// Crear una carta con título y subtítulo
				var splashCard = new UI.Card({
					icon:'images/transanpebble.png',
					title: 'TransanPbl',
					subtitle: '¿Cuanto falta?',
					body: "Consultando por parada "+paradero
				});

				// Mostrar la carta
				splashCard.show();
				// Construir URL
				var URL = baseURL + paradero;
				// Hacer la petición
				ajax(
					{
						url: URL,
						type: 'json'
					},
					function(data) {
						// ¡Éxito!
						console.log('Datos de bus obtenidos satisfactoriamente: '+data.id+'/'+data.horaConsulta+'/'+data.descripcion);
						console.log("Hay "+data.servicios.length+" servicios...");
						console.log(data);
						// Extraer datos
						var idParadero = data.id;
						var horaConsulta = data.horaConsulta;
						//Crear lista de buses
						var menuItems = listaBuses(data);
						if (idParadero != "NULL") {
							var resultados = new UI.Menu({
								sections: [{
									title: idParadero + " - " + horaConsulta,
									items: menuItems
								}]
							});
							splashCard.hide();
							resultados.show();
							//Si se hace click en un resultado:
							resultados.on('select', function(e) {
								var servicioDatos = data.servicios[e.itemIndex];
								var valido = servicioDatos.valido;
								var servicio = servicioDatos.servicio;
								var subtitulo;
								var descripcion;
								if (valido=='0') {
									subtitulo = "";
									descripcion = servicioDatos.descripcionError;
								} else {
									var patente = servicioDatos.patente;
									var tiempo = servicioDatos.tiempo;
									var distancia = servicioDatos.distancia;
									subtitulo = patente;
									descripcion = "Tiempo: "+tiempo+"\n"+
																		"Distancia: "+distancia;
								}

								var detailCard = new UI.Card({
									icon:'images/transanpebble.png',
									title: servicio,
									subtitle: subtitulo,
									body: descripcion
								});
								detailCard.show();
							});
						} else {
							//Mostrar error de paradero inexistente.
							splashCard.hide();
							splashCardErrorParadero.show();
						}
					},
					function(error) {
						// Error :'(
						console.log('Error al obtener datos:  ' + error);
					}
				);
			});
}


//Funciones de localización
function locationSuccess(position) {
  pos.lat = position.coords.latitude;
  pos.long = position.coords.longitude;
  console.log('lat= ' + pos.lat + ' long= ' + pos.long);
	misParaderos = paraderosCercanos(pos.lat,pos.long);
	splashCardLocation.hide();		
	if (misParaderos!==null) {
		mostrarListaParaderos();
	} else {
		//Mostrar splash señalando que no hay paraderos
		splashCardNoneLocation.show();
	}
}


function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
	splashCardErrorLocation.show();

}

//Inicio lineal de la aplicación

//Menu preguntando por locacion o guardados

var menuPrincipal = new UI.Menu ({
	sections: [{
		title: "TransanPbl",
		items: [{
			title: "Guardados",
			icon: 'images/favoritos.png'
		},
		{
			title: "Cercanos",
			icon: 'images/ubicacion.png'
		},
		{
			title: "Acerca de",
			icon: 'images/logoadderou.png'
		}]
	}]
});
menuPrincipal.show();

menuPrincipal.on('select',function(e) {
	if (e.itemIndex===0) {
		misParaderos =  paraderosGuardados();
		if (misParaderos!==null && misParaderos!==undefined) {
			mostrarListaParaderos();
		} else {
			splashCardErrorSaved.show();
		}
	} 
	else if (e.itemIndex==1) {
		splashCardLocation.show();
		navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
		console.log("Posición obtenida");
	}	else {
		splashCardAbout.show();
	}
});
