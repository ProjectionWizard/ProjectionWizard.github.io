/*
 * PROJECTION WIZARD v2.1
 * Map Projection Selection Tool
 *
 * Author: Bojan Savric
 * Date: September, 2024
 *
 */

window.onload = init;

/*GLOBAL VARIABLES*/
//map and layers
var map, rectangle, angUnit, attributionControl;
//bounds of the rectangle
var latmax, latmin, lonmax, lonmin;
//preview map variables
var previewMapProjection, previewMapLat0;

/*Updating rectangle bounds*/
function updateMapArea (N, S, E, W, checkWMbounds) {
	latmax = N;
	latmin = S;
	lonmax = E;
	lonmin = W;
	
	//when user changes the direction
	var temp;
	if (lonmin > lonmax) {
		temp = lonmin;
		lonmin = lonmax;
		lonmax = temp;
	}
	if (latmax < latmin) {
		temp = latmax;
		latmax = latmin;
		latmin = temp;
	}

	//check if values are out of WM bounds
	if (checkWMbounds) {
		// fixing North and South values
		if (latmax > 85.5) {
			latmax = 90.0;
		}
		if (latmin < -85.5) {
			latmin = -90.0;
		}
	}
}

/*Reading geographic coordinates*/
function readLAT(latS) {
	var num;
	
	if ( angUnit == "DMS" ) {
		num = dms2ddLAT(latS);
	}
	else {
		num = parseFloat(latS);
	}
	
	if (num >  90.0) num =  90.0;
	if (num < -90.0) num = -90.0;

	return num;
}

function readLON(lonS) {
	if ( angUnit == "DMS" ) {
		return dms2ddLON(lonS);
	}

	return parseFloat(lonS);
}

/*Outputing geographic coordinates*/
function outputLAT(lat, ui_bool) {
	if ( angUnit == "DMS" ) {
		if ( ui_bool ) {
			return dd2dmsLAT(lat);
		}

		return dd2dmLAT(lat);
	}
	
	if ( ui_bool ) {
		return Math.round(lat * 1e7) / 1e7;
	}

	return Math.round(lat * 1e7) / 1e7 + "º";
}

function outputLON(lon, ui_bool) {
	if ( angUnit == "DMS" ) {
		if ( ui_bool ) {
			return dd2dmsLON(lon);
		}

		return dd2dmLON(lon);
	}
	
	if ( ui_bool ) {
		return Math.round(lon * 1e7) / 1e7;
	}

	return Math.round(lon * 1e7) / 1e7 + "º";
}

/* Normalizing longitude values */
function normalizeLON(lon, lon0) {
	while (lon < (lon0 - 180.0)) {
		lon += 360.0;
	}
	while (lon > (lon0 + 180.0)) {
		lon -= 360.0;
	}
	return lon;
}

/*Updating input boxes*/
function setInputBoxes() {
	document.getElementById("latmax").value = outputLAT(latmax, true);
	document.getElementById("latmin").value = outputLAT(latmin, true);
	document.getElementById("lonmax").value = outputLON(lonmax, true);
	document.getElementById("lonmin").value = outputLON(lonmin, true);
}


/*Updating rectangle*/
function updateRectangle() {
	//Getting angular unit
	angUnit = $('input[name=ang_format]:checked').val();
	
	//update inputs
	setInputBoxes();

	//updating bounds for the rectangle on the map
	var SouthWest = new L.LatLng(latmin, lonmin),
	NorthEast = new L.LatLng(latmax, lonmax),
	bounds = new L.LatLngBounds(SouthWest, NorthEast);

	rectangle.pm.disable();
	rectangle.setBounds(bounds);

	//Display the output
	makeOutput();

	rectangle.pm.enable({
		allowSelfIntersection: false
	})

	map.pm.enableGlobalDragMode()
}


/*INPUT BOX CALLBACK FUNCTION*/
//This function is called in index.html
function changeInput () {
	// Reading from the input and fixing values
	var North = readLAT(document.getElementById("latmax").value);
	var South = readLAT(document.getElementById("latmin").value);
	var East  = readLON(document.getElementById("lonmax").value);
	var West  = readLON(document.getElementById("lonmin").value);

	//Updating the rectangle
	updateMapArea(North, South, East, West, false);
	updateRectangle();

	map.fitBounds(rectangle.getBounds());
}

/*RESET BUTTON CALLBACK FUNCTION*/
function resetUI(map) {
	//Updating Radio List
	//document.getElementById("Equalarea").checked = true;

	//Updating the rectangle
	updateMapArea(90.0, -90.0, 180.0, -180.0, false);
	updateRectangle();

	//Updating the map view
	map.setView( [0, 0], 0);
}


/*FIT BUTTON CALLBACK FUNCTION*/
function fitSquare(map) {
	//getting bounds from the map
	var zoomBounds = map.getBounds();
	var zoomCenter = map.getCenter();
	var SW = zoomBounds.getSouthWest();
	var NE = zoomBounds.getNorthEast();

	//getting the interval
	var dLat = Math.min(Math.abs(NE.lat - zoomCenter.lat), Math.abs(zoomCenter.lat - SW.lat))*0.8;
	var dLon = (NE.lng - SW.lng) / 2.5;
	if (dLon > 180.0)
		dLon = 180.0;

	//setting new bounds for the rectangle
	var North = zoomCenter.lat + dLat;
	var South = zoomCenter.lat - dLat;
	var East  = zoomCenter.lng + dLon;
	var West  = zoomCenter.lng - dLon;

	// updating the bounds in the input form boxes
	updateMapArea(North, South, East, West, true);
	updateRectangle();
}


/*MAP MOUSEMOVE CALLBACK FUNCTION*/
//For every move, attribution displays mouse position
function showCoords(event) {
	var stringPos = "";

	//LATITUDE STRING
	stringPos = outputLAT(event.latlng.lat, true) + "  |  ";

	//LONGITUDE STRING
	var lam = event.latlng.lng;

	//Normalizing longitude value
	lam = normalizeLON(lam, 0.);
	stringPos += outputLON(lam, true);

	//CHANGING ATTRIBUTION CONTROL
	attributionControl.setPrefix(stringPos);
}

/*CREATES BACKGROUND LAYER*/
function loadBaseLayer(map) {
	var esriNatGeoURL = 'https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile//{z}/{y}/{x}.png';
	L.tileLayer(esriNatGeoURL, {
		maxZoom: 10
	}).addTo(map)
}

function toggleAnchorVisibility () {
	/* ideally pm would update the anchors as the geometry is dragged.
	as a workaround, we can just hide them temporarily */
	const nodeList = document.querySelectorAll('.marker-icon');
	for (var i = 0; i < nodeList.length; i++) {
		var node = nodeList[i];
		(node.style.display === 'none') ? node.style.display = '' : node.style.display = 'none';
	}
}

/*ADDS A SELECTED AREA RECTANGLE*/
function addRectangle (map) {
	updateMapArea(90.0, -90.0, 180.0, -180.0, false);

	//Creating rectangle
	rectangle = L.rectangle([[latmax, lonmax], [latmin, lonmin]]);

	// updating the bounds in the input form
	setInputBoxes();

	rectangle.on('pm:edit', function (e) {
		const rectangle = e.sourceTarget;
		// reading changed bounds
		var newBounds = rectangle.getBounds();

		var SW = newBounds.getSouthWest();
		var NE = newBounds.getNorthEast();

		// updating the bounds
		updateMapArea(NE.lat, SW.lat, NE.lng, SW.lng, true);

		// update the rest of the UI
		setInputBoxes();
		makeOutput();
	});

	rectangle.on("pm:markerdragstart", function() {
		toggleAnchorVisibility();

		// force ON the orange color when starting a vertex drag
		rectangle.fire('mouseover');

		// while dragging any of the corner vertices,
		// turn OFF the mouseover and mouseout handlers that can conflictingly change the rectangle colors
		pauseRectangleInteractionEvents();
	});

	rectangle.on("pm:markerdragend", function () {
		toggleAnchorVisibility();

		// turn ON the mouseover and mouseout handlers that change the rectangle colors
		resumeRectangleInteractionEvents();

		// force OFF the orange color after a vertex drag end to return to the non-editing blue color
		rectangle.fire('mouseout');
	});

	rectangle.on("pm:drag", function(e) {
		const rectangle = e.sourceTarget;
		// reading changed bounds
		var newBounds = rectangle.getBounds();

		var SW = newBounds.getSouthWest();
		var NE = newBounds.getNorthEast();

		// updating the bounds
		updateMapArea(NE.lat, SW.lat, NE.lng, SW.lng, true);

		// update the rest of the UI
		setInputBoxes();

		makeOutput(true);
	});

	rectangle.on("pm:markerdrag", function(e) {
		const liveCorner = e.markerEvent.latlng
		const allCorners = e.sourceTarget.getLatLngs();

		// loop through each rectangle vertex to determine which one is opposite the corner being dragged
		for (i = 0; i < allCorners[0].length; i++) {
			if (liveCorner.lat !== allCorners[0][i].lat && liveCorner.lng !== allCorners[0][i].lng) {
				var oppositeCorner = allCorners[0][i];
				break;
			}
		}

		const deltaLng = Math.abs(liveCorner.lng - oppositeCorner.lng);

		// dont allow the horizontal span of the rectangle to exceed 360deg
		if (deltaLng > 360) {
			if (liveCorner.lng < oppositeCorner.lng)
			oppositeCorner.lng = liveCorner.lng + 360.0;
			else
			oppositeCorner.lng = liveCorner.lng - 360.0;
		}

		updateMapArea(liveCorner.lat, oppositeCorner.lat, liveCorner.lng, oppositeCorner.lng, true);

		// update Rectangle bounds *without* toggling edit mode
		var SouthWest = new L.LatLng(latmin, lonmin),
        NorthEast = new L.LatLng(latmax, lonmax),
		bounds = new L.LatLngBounds(SouthWest, NorthEast);
		rectangle.setBounds(bounds);

		setInputBoxes();

		makeOutput(true);
	});

	//Event handler: Double click the rectangle
	rectangle.on("dblclick", function(e) {
		// reading bounds
		var recBounds = e.sourceTarget.getBounds();
		//fitting view on rectangle extent
		map.fitBounds(recBounds);
	});

	function pauseRectangleInteractionEvents() {
		rectangle.off('mouseover');
		rectangle.off('mouseout');
	}

	function resumeRectangleInteractionEvents() {
		//Event handler: Mouse over the rectangle
		rectangle.on("mouseover", function(e) {
			//Setting active editing style
			rectangle.setStyle({
				color: "#ff7b1a" // orange
			});

			// temporarily disable the map's default behavior of doubleClickZoom
			map.doubleClickZoom.disable();
		});
	
		//Event handler: Mouse out the rectangle
		rectangle.on("mouseout", function(e) {
			//Setting starting style
			rectangle.setStyle({
				color : "#3388ff" // blue
			});

			// re-enable the map's default behavior of doubleClickZoom
			map.doubleClickZoom.enable();
		});
	}

	rectangle.on('pm:dragstart', function (e) {
		toggleAnchorVisibility();

		// while dragging the entire rectangle,
		// turn OFF the mouseover and mouseout handlers that can conflictingly change the rectangle colors
		pauseRectangleInteractionEvents();
	});

	rectangle.on('pm:dragend', function (e) {
		toggleAnchorVisibility();

		// turn ON the mouseover and mouseout handlers that change the rectangle colors
		resumeRectangleInteractionEvents()

		// while the user is still hovering over the rectangle after dragging is finished,
		// try to prevent the pm editor code from reverting back to the starting blue color
		rectangle.pm.cachedColor = "#ff7b1a"; // orange

		// again, make sure the current color is the orange active editing color,
		// since the user is likely still hovering over the rectangle
		rectangle.fire('mouseover');

		rectangle.pm.enable({
			allowSelfIntersection: false
		});
	});

	//Adding layer to the map
	map.addLayer(rectangle);

	rectangle.pm.toggleEdit({
		allowSelfIntersection: false
	});

	// allow both dragging and resizing the rectangle
	map.pm.toggleGlobalDragMode();

	// turn ON the mouseover and mouseout handlers that change the rectangle colors
	resumeRectangleInteractionEvents();
}

/*MAIN FUNCTION*/
function init() {
	//Selecting equal-area radio button
	document.getElementById("Equalarea").checked = true;

	//Setting angular unit
	angUnit = $('input[name=ang_format]:checked').val();

	//Options button
	$( "#options_dialog" ).dialog({ autoOpen: false });
	$( "#settings" ).button();
	$( "#settings" ).click(function() {
		//Setting dialog content
		var NewDialog = $( "#options_dialog" );
		//Setting dialog window
		NewDialog.dialog({
			modal : true,
			show : 'puff',
			hide : 'explode',
			width : 'auto',
			height : 'auto',
			title : "Projection Wizard Options",
			buttons : {
				OK : function() {
					$(this).dialog("close");
					updateRectangle();
				}
			}
		});

		//Opening dialog window
		NewDialog.dialog( "open" );
	});

	//Update the output and/or extent input boxes immediately when settings change
	document.querySelector('#ang_format').addEventListener('change', updateRectangle);
	document.querySelector('#roundCM').addEventListener('change', updateRectangle);
	document.querySelector('#showEextent').addEventListener('change', updateRectangle);
	document.querySelector('#showCenter').addEventListener('change', updateRectangle);

	//Help button
	$( "#dialog" ).dialog({ autoOpen: false });
	$( "#help" ).button();
	$( "#help" ).click(function() {
		//Defining window size
		var dWidth = $(window).width() * .5;
		if (dWidth > 600) dWidth = 800;
		var dHeight = $(window).height() * .7;

		//Setting dialog content
		var NewDialog = $( "#dialog" );
		//Setting dialog window
		NewDialog.dialog({
			modal : true,
			show : 'puff',
			hide : 'explode',
			width : dWidth,
			height : dHeight,
			title : "Projection Wizard",
			buttons : {
				OK : function() {
					$(this).dialog("close");
				}
			}
		});

		//Opening dialog window
		NewDialog.dialog( "open" );
	});

	//Tooltip call
	$(function() {
		$(document).tooltip();
	});

	//Creates a map
	map = new L.Map('map', {
		attributionControl: false,
	}).setView([0,0], 0);

	//Moving zoom controls to the right
	map.zoomControl.setPosition('topright');

	//Fit bounds button
	$("#fit").button();
	$("#fit").click(function() {
		fitSquare(map)
	});

	//Reset button
	$("#reset").button();
	$("#reset").click(function() {
		resetUI(map)
	});

	//Reset button
	$("#view").button();
	$("#view").click(function() {
		//Updating the map view
		map.setView([0.0, rectangle.getBounds().getCenter().lng], 0);
	});

	//Event handlers of the map
	map.on("mousemove", showCoords);
	map.on("mouseout", function(e) {
		attributionControl.setPrefix(false);
	});

	//Resizing preview map
	window.addEventListener("resize", function() {

	});

	//Adding attribution control to the map
	attributionControl = new L.Control.Attribution({
		prefix: false
	}).addTo(map);

	//Loading base layer
	loadBaseLayer(map);

	//Add the rectangle box to the map
	addRectangle(map);

	//Display the output
	makeOutput();
	
	//PROJ dialog
	$( "#PROJ" ).dialog({ autoOpen: false });
	
	//WKT dialog
	$( "#WKT" ).dialog({ autoOpen: false });
}
