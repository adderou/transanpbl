<?php
if (!isset($_GET['paradero'])) {
	$paradero = "null";
} else {
	$paradero = $_GET['paradero'];
}

$url = "http://web.smsbus.cl/web/buscarAction.do";
$headers = array();
if (false !== ($f = fopen('http://web.smsbus.cl/web/buscarAction.do?d=cargarServicios', 'r'))) {
        $meta = stream_get_meta_data($f);
        $headers = $meta['wrapper_data'];
        fclose($f);
}
$header="";
foreach ($headers as $property) {
	$num = strpos($property,"JSESSIONID");
	if ($num !== false) {
		$cookies = substr($property,$num);
		break;
	}
}
$postdata = http_build_query(
    array(
        'd' => "busquedaParadero",
        'ingresar_paradero' => $paradero
    )
);	
$opts = array('http' =>
    array(
        'method'  => 'POST',
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n".
					  "Cookie: 	".$cookies,
		'content' => $postdata
    )
);

$context  = stream_context_create($opts);

$servel = file_get_contents($url, false, $context);

preg_match("'<span class=\"texto_h1\">(.*?) hrs</span>'si", $servel, $horaConsulta);
preg_match("'<span class=\"texto_h2\">(.*?)</span>'si", $servel, $idParadero);
//Si la micro es solo una
preg_match("'<span class=\"texto_h3\">N&deg; de Servicio:</span> <span class=\"texto_h2\">(.*?)</span>'si", $servel, $idRecorrido);
preg_match("'<div class=\"texto_h3\" id=\"nombre_paradero_respuesta\">Paradero: (.*?)</div>'si", $servel, $descripcionParadero);

if ($descripcionParadero[1]==="") {
	$descripcionParadero[1]="Paradero no válido";
	$idParadero[1]="NULL";
}

$buses = array();
$convert = explode("\n", $servel); 
for ($i=53;$i<count($convert);$i++){
	//Buscamos los array con errores
	$numError = strpos($convert[$i],'<div class="texto_respuesta" id="servicio_error_solo_paradero">');
	// Si el elemento actual es un error:
	if ($numError !== false) {
		$nuevoBus = array();
		$nuevoBus['valido']=0;
		//se toma la id del bus
		preg_match("'<div class=\"texto_respuesta\" id=\"servicio_error_solo_paradero\">(.*?)</div>'si", $convert[$i], $servicioBus);
		$nuevoBus['servicio'] = $servicioBus[1];
		//se toma la descripción del error
		$i++;
		preg_match("'<div class=\"texto_error\" id=\"respuesta_error_solo_paradero\">(.*?)</div>'si", $convert[$i], $descripcionError);
		$nuevoBus['descripcionError'] = $descripcionError[1];
		//se agrega el bus al array de buses;
		$buses[] = $nuevoBus;
		continue;
	}
	//Buscamos array normales tipo 1
	$numNormal1 = strpos($convert[$i],'<div id="siguiente_respuesta">');
	//Si el elemento actual es normal tipo 1:
	if ($numNormal1 !== false) {
		$nuevoBus = array();
		$nuevoBus['valido']=1;
		//id bus
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"servicio_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $idBus);
		$nuevoBus['servicio'] = $idBus[1];
		//patente bus
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"bus_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $patenteBus);
		$nuevoBus['patente'] = $patenteBus[1];
		//tiempo bus		
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"tiempo_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $tiempoBus);
		$nuevoBus['tiempo'] = $tiempoBus[1];
		//distancia paradero
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"distancia_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $distanciaBus);
		$nuevoBus['distancia'] = $distanciaBus[1];
		$i++;
		//se agrega el bus al array de buses;
		$buses[] = $nuevoBus;
		continue;

	}
	//Buscamos array normales tipo 2
	$numNormal2 = strpos($convert[$i],'<div id="proximo_solo_paradero">');
	if ($numNormal2 !== false) {
		$nuevoBus = array();
		$nuevoBus['valido']=1;
		//id bus
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"servicio_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $idBus);
		$nuevoBus['servicio'] = $idBus[1];
		//patente bus
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"bus_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $patenteBus);
		$nuevoBus['patente'] = $patenteBus[1];
		//tiempo bus		
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"tiempo_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $tiempoBus);
		$nuevoBus['tiempo'] = $tiempoBus[1];
		//distancia paradero
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"distancia_respuesta_solo_paradero\">(.*?)</div>'si", $convert[$i], $distanciaBus);
		$nuevoBus['distancia'] = $distanciaBus[1];
		$i++;
		//se agrega el bus al array de buses;
		$buses[] = $nuevoBus;
		continue;
	}
	
	//Buscamos array de páginas de recorrido único (unico)
		$unico = strpos($convert[$i],'<div id="proximo_respuesta">');
	if ($unico !== false) {
		$nuevoBus = array();
		$nuevoBus['valido']=1;
		//id bus está en el header así que lo sacamos de ahí
		$nuevoBus['servicio'] = $idRecorrido[1];
		//patente bus
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"proximo_bus_respuesta\">(.*?)</div>'si", $convert[$i], $patenteBus);
		$nuevoBus['patente'] = $patenteBus[1];
		//tiempo bus		
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"proximo_tiempo_respuesta\">(.*?)</div>'si", $convert[$i], $tiempoBus);
		$nuevoBus['tiempo'] = $tiempoBus[1];
		//distancia paradero
		$i++;
		preg_match("'<div class=\"texto_respuesta\" id=\"proximo_distancia_respuesta\">(.*?)</div>'si", $convert[$i], $distanciaBus);
		$nuevoBus['distancia'] = $distanciaBus[1];
		$i++;
		//se agrega el bus al array de buses;
		$buses[] = $nuevoBus;
		continue;
	}
}

$jsonObj = array(
			"horaConsulta"=>$horaConsulta[1],
			"id"=>$idParadero[1],
			"descripcion"=>$descripcionParadero[1],
			"servicios"=>$buses
			);

if (!isset($_GET['sort']) || $_GET['sort']=="time") {
	$llegada = array();
	foreach ($jsonObj['servicios'] as $key => $row) {
		if ($row["valido"]==1) {
	   		$llegada[$key] = intval($row['distancia']);
	   	} else {
	   		$llegada[$key] = INF;
	   	}
	}

	array_multisort($llegada, SORT_ASC, $jsonObj['servicios']);
}

echo json_encode($jsonObj);