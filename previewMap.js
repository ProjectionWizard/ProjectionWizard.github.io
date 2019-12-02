/*
 * PROJECTION WIZARD v2.0
 * Map Projection Selection Tool
 * 
 * Author: Bojan Savric
 * Date: June, 2019
 * 
 */

var world110m, world50m;

/***MAP DRAW FUNCTION FOR SMALL-SCALE***/
function addWorldMapPreview(center, projection, currentlyDragging) {
	//Creating canvas HTML element
  addCanvasMap(0, center.lng, projection, 1, currentlyDragging);

	//adding class to split text and map preview
	$("#result").addClass("results");
}

/***MAIN MAP DRAW FUNCTION***/
function addMapPreview(center, currentlyDragging) {
	//Creating canvas HTML element
  addCanvasMap(previewMapLat0, center.lng, previewMapProjection, 0, currentlyDragging);
	
	//adding class to split text and map preview
	$("#result").addClass("results");
}

/* Setting a new projection with D3 */
function pickProjection(lat0, lon0, projectionString) {
	//Definding D3 projection
	if (projectionString == 'AzimuthalEqualArea') {
		return d3.geoAzimuthalEqualArea()
			.clipAngle(180 - 1e-3)
			.precision(.1)
			.rotate([-lon0, -lat0]);
	}
	else if (projectionString == 'AzimuthalEquidistant') {
		return d3.geoAzimuthalEquidistant()
			.clipAngle(180 - 1e-3)
			.precision(.1)
			.rotate([-lon0, -lat0]);
	} 
	else if (projectionString == 'Orthographic') {
		return d3.geoOrthographic()
			.clipAngle(90)
			.rotate([-lon0, -lat0]);
	}
	else if (projectionString == 'Stereographic') {
		return d3.geoStereographic()
			.rotate([-lon0, -lat0])
			.clipAngle(90)
			//.clipExtent([[0, 0], [width, height]])
			.precision(.1);
	}
	else if (projectionString == 'PlateCarree') {
		return d3.geoEquirectangular()
			.precision(.1)
			.rotate([-lon0, 0]);
	}
	else if (projectionString == 'Mercator') {
		return d3.geoMercator()
			.precision(.1)
			.rotate([-lon0, 0]);
	}
	else if (projectionString == 'TransverseMercator') {
		return d3.geoTransverseMercator()
			.precision(.1)
			.rotate([-lon0, 0]);
	}
	else if (projectionString == 'CylindricalEqualArea') {
		var interval = (latmax - latmin) / 4.;
		var latS1 = lat0 + interval, latS2 = lat0 - interval, latS;

		if ((latS1 > 0. && latS2 > 0.) || (latS1 < 0. && latS2 < 0.)) {
			latS = Math.max(Math.abs(latmax), Math.abs(latmin)) / 2.;
		} else {
			latS = 0.;
		}
				
		return d3.geoCylindricalEqualArea()
			.parallel(latS)
			.precision(.1)
			.rotate([-lon0, 0]);
	}
	else if (projectionString == 'TransverseCylindrical') {
		var scale = 1.5;
		return d3.geoTransverseCylindricalEqualArea()
			.parallel(0)
			.precision(.1)
			.rotate([-lon0, 0, 90]);
	}
	else if (projectionString == 'ConicEquidistant') {
		var interval = (latmax - latmin) / 6;
		return d3.geoConicEquidistant()
			.parallels([latmin + interval, latmax - interval])
			.center([0, lat0])
			.precision(.1)
			.rotate([-lon0, 0]);
	}
	else if (projectionString == 'ConicEqualArea') {
		var interval = (latmax - latmin) / 6;
		return d3.geoAlbers()
			.rotate([-lon0, 0])
			.center([0, lat0])
			.parallels([latmin + interval, latmax - interval])
			.precision(.1);
	}
	else if (projectionString == 'ConicConformal') {
		var interval = (latmax - latmin) / 6;
		return d3.geoConicConformal()
			.rotate([-lon0, 0])
			//.clipAngle(90)			
			.center([0, lat0])
			.parallels([latmin + interval, latmax - interval])
			.precision(.1);
	}
	else if (projectionString == 'Equal Earth') {
		return d3.geoEqualEarth()
			.rotate([-lon0, 0])
			.precision(.1);
	}
	else if (projectionString == 'Natural Earth') {
		return d3.geoNaturalEarth()
			.rotate([-lon0, 0])
			.precision(.1);
	} 
	else {
		// projection error condition
		var previewMapProjectionName = $("#previewMap #projectionName");
		previewMapProjectionName.append("<p></p><p></p><p>Map preview not avaliable</p><p></p><p></p>");
		return;
	}
}

function clearCanvasMap() {
	// helper function to clear the d3 preview map canvas because
	// 1. the canvas context and the projection name display must be cleared before being updated
	// 2. some other conditions do not show the d3 preview map at all
	var previewMapCanvas = d3.select("#previewMap canvas").node();
	previewMapCanvas
		.getContext("2d")
		.clearRect(0, 0, previewMapCanvas.width, previewMapCanvas.height);
	
	// to be safe, also clear the projection name text below the d3 preview map
	var previewMapProjectionName = $("#previewMap #projectionName");
	previewMapProjectionName.empty();
}

/* Map drawing function (D3)*/
function addCanvasMap(lat0, lon0, projectionString, world, currentlyDragging) {
	// first and only once, attempt to fetch both of the needed world geojson files
	// otherwise, continue with the geojson files that were already fetched
	if (!world110m && !world50m) {
		Promise
			.all([
				d3.json("https://cdn.jsdelivr.net/npm/world-atlas@1/world/110m.json"),
				d3.json("https://cdn.jsdelivr.net/npm/world-atlas@1/world/50m.json")
			])
			.then(function(allGeoJsonData) {
				world110m = allGeoJsonData[0];
				world50m = allGeoJsonData[1];

				continueDrawingCanvasMap(world110m, world50m, lat0, lon0, projectionString, world, currentlyDragging);
			});
	} else {
		continueDrawingCanvasMap(world110m, world50m, lat0, lon0, projectionString, world, currentlyDragging);
	}

}

function continueDrawingCanvasMap(world110m, world50m, lat0, lon0, projectionString, world, currentlyDragging) {
	// clear the canvas context and the projection name display must be cleared before being updated
	clearCanvasMap();

	//Defining D3 projection
	var projection = pickProjection(lat0, lon0, projectionString);
	if (projection == null) {
		return;
	}

	//Set the display text of the projection name that appears below the d3 preview map
	var previewMapProjectionName = $("#previewMap #projectionName");
	if (previewMapProjection == 'ConicEquidistant') {
		previewMapProjectionName.append("<br>Equidistant conic<br><br>");
	} else {
		previewMapProjectionName.append("<br>" + projectionString + "<br><br>");
	}
	
	//Scaling projection on original coordinates
	projection.scale(1).translate([0,0]);
	var max_width = document.getElementById('previewMap').offsetWidth, 
		height, width, scaleFactor;

	//Computing scale factor and translation for world maps
	if (world) {
		//Computing extent coordinates
		projection.rotate([0, 0]);
		var coord1 = projection([180, 0]), 
			coord2 = projection([-180, 0]), 
			coord3 = projection([0, 90]), 
			coord4 = projection([0, -90]);

		//Definding original width and height of the extent
		width = Math.abs(coord1[0] - coord2[0]);
		height = Math.abs(coord3[1] - coord4[1]);
		
		//scaling map on the width to be 1
		scaleFactor = 1 / width;
		
		//Final scaling factor and translation parameters
		var X = Math.min(max_width / width, max_width / height)/1.5;
		width *= X;
		height *= X;
		scaleFactor *= width;
		
		projection.rotate([-lon0, 0])
			.scale(scaleFactor)
			.translate([width / 2, height / 2]);
	} 
	//Computing scale factor and translation for other maps
	else {
		//Computing extent coordinates
		var coord1 = projection([lonmin, latmax]),
			coord2 = projection([lonmax, latmax]), 
			coord3 = projection([lonmax, latmin]), 
			coord4 = projection([lonmax, latmin]), 
			coord5 = projection([(lonmax + lonmin) / 2, latmin]), 
			coord6 = projection([(lonmax + lonmin) / 2, latmax]), 
			coord7 = projection([lonmin, (latmin + latmax) / 2]), 
			coord8 = projection([lonmax, (latmin + latmax) / 2]), 
			coord9 = projection([(lonmax + 3 * lonmin) / 4, latmin]), 
			coord10 = projection([(3 * lonmax + lonmin) / 4, latmin]), 
			coord11 = projection([(lonmax + 3 * lonmin) / 4, latmax]), 
			coord12 = projection([(3 * lonmax + lonmin) / 4, latmax]);

		//Definding original width and height of the extent
		width = Math.abs(Math.max(coord1[0], coord2[0], coord3[0], coord4[0], coord5[0], coord6[0], coord7[0], coord8[0], coord9[0], coord10[0], coord11[0], coord12[0]) - Math.min(coord1[0], coord2[0], coord3[0], coord4[0], coord5[0], coord6[0], coord7[0], coord8[0], coord9[0], coord10[0], coord11[0], coord12[0]));
		height = Math.abs(Math.max(coord1[1], coord2[1], coord3[1], coord4[1], coord5[1], coord6[1], coord7[1], coord8[1], coord9[1], coord10[1], coord11[1], coord12[1]) - Math.min(coord1[1], coord2[1], coord3[1], coord4[1], coord5[1], coord6[1], coord7[1], coord8[1], coord9[1], coord10[1], coord11[1], coord12[1]));
		
		//scaling map on the width to be 1
		scaleFactor = 1 / width;
		
		//Final scaling factor and translation parameters
		var X = Math.min(max_width / width, max_width / height);
		width *= X;
		height *= X;
		scaleFactor *= width;
	
		projection.scale(scaleFactor);
		var coordTran = projection([lon0, (latmax + latmin) / 2]);
		projection.translate([width / 2, height / 2 - coordTran[1]]);
	}

	//Setting data layer
  var data;
	var scale = 720. / (lonmax - lonmin) / (Math.sin(latmax * Math.PI / 180.) - Math.sin(latmin * Math.PI / 180.));
	
	if (currentlyDragging || (scale < 6)) {
    data = world110m;
	} else {
    data = world50m;
	}

	//Drawing map elements
	var graticule = d3.geoGraticule(),
		sphere = {type : "Sphere"};

  var canvas = d3.select("#previewMap canvas")
		.attr("width", width)
		.attr("height", height);

	var context = canvas.node().getContext("2d");

	var path = d3.geoPath(projection, context);

	land = topojson.feature(data, data.objects.countries); 
	grid = graticule();

	// Style sphere
	context.beginPath();
	path(sphere);
	context.fillStyle = "#add8e6";
	context.fill();

	// Style land
	context.beginPath();
	path(land);
	context.fillStyle = "#eee";
	context.fill();
	context.lineWidth = 0.3;
	context.strokeStyle = "#999";
	context.stroke();
	
	// Style graticule
	context.beginPath();
	path(grid);
	context.lineWidth = 0.5;
	context.globalAlpha = 0.2;
	context.strokeStyle = "#555";
	context.stroke();
	context.globalAlpha = 1;
}
