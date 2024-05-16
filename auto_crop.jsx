app.preferences.rulerUnits = Units.PIXELS
app.preferences.typeUnits = TypeUnits.PIXELS
app.displayDialogs = DialogModes.NO
var crop_boundary = 30

Array.prototype.sum = function(){
	var res = 0;
	for(var c = 0; c<this.length; c++){
		res += this[c];
	}
	return res
}

function getLayerByName(name, type, pos){
	// name is a string of the name of the requested layer/layerset
	// type is a string and is either "ArtLayer" or "LayerSet"
	// pos is the starting position and should be left blank
		
		if(arguments.length == 1){
			getLayerByName(arguments[0], "undefined", app.activeDocument);
		}
		if(String(pos) === "undefined"){
			pos = app.activeDocument;
		}
		if(String(type) === "undefined"){
			for(var x = 0; x < pos.artLayers.length; x ++){
				if(pos.artLayers[x].name == name){
					app.activeDocument.activeLayer = pos.artLayers[x];
					return app.activeDocument.activeLayer;
				}
			}
			for(var c = 0; c < pos.layerSets.length; c ++){
				if(pos.layerSets[c].name == name){
					app.activeDocument.activeLayer = pos.layerSets[c];
					return app.activeDocument.activeLayer;
				}
				else{
					getLayerByName(name, "undefined", pos.layerSets[c])
				}
			}
		}
		// Run this if the type is defined
		else{
			for(var x = 0; x < pos.artLayers.length; x++){
				if(pos.artLayers[x].name == name && pos.artLayers[x].typename == type){
					app.activeDocument.activeLayer = pos.artLayers[x];
					return app.activeDocument.activeLayer;
				}
			}
			for(var c = 0; c < pos.layerSets.length; c ++){
				if(pos.layerSets[c].name.toLowerCase() == name.toLowerCase() && pos.layerSets[c].typename == type){
					app.activeDocument.activeLayer = pos.layerSets[c];
					return app.activeDocument.activeLayer;
				}
				else{
					getLayerByName(name, type, pos.layerSets[c])
				}
			}	
		}
		return app.activeDocument.activeLayer;
}

function constrain_Image_size(){
	if(app.activeDocument.width>app.activeDocument.height && app.activeDocument.width>4000){
		var idimageSize = stringIDToTypeID( "imageSize" );
		var desc11 = new ActionDescriptor();
		var idwidth = stringIDToTypeID( "width" );
		var idpixelsUnit = stringIDToTypeID( "pixelsUnit" );
		desc11.putUnitDouble( idwidth, idpixelsUnit, 4000.000000 );
		var idscaleStyles = stringIDToTypeID( "scaleStyles" );
		desc11.putBoolean( idscaleStyles, true );
		var idconstrainProportions = stringIDToTypeID( "constrainProportions" );
		desc11.putBoolean( idconstrainProportions, true );
		var idinterfaceIconFrameDimmed = stringIDToTypeID( "interfaceIconFrameDimmed" );
		var idinterpolationType = stringIDToTypeID( "interpolationType" );
		var idautomaticInterpolation = stringIDToTypeID( "automaticInterpolation" );
		desc11.putEnumerated( idinterfaceIconFrameDimmed, idinterpolationType, idautomaticInterpolation );
		executeAction( idimageSize, desc11, DialogModes.NO );
	}else if (app.activeDocument.height>4000){
		var idimageSize = stringIDToTypeID( "imageSize" );
		var desc16 = new ActionDescriptor();
		var idheight = stringIDToTypeID( "height" );
		var idpixelsUnit = stringIDToTypeID( "pixelsUnit" );
		desc16.putUnitDouble( idheight, idpixelsUnit, 4000.000000 );
		var idscaleStyles = stringIDToTypeID( "scaleStyles" );
		desc16.putBoolean( idscaleStyles, true );
		var idconstrainProportions = stringIDToTypeID( "constrainProportions" );
		desc16.putBoolean( idconstrainProportions, true );
		var idinterfaceIconFrameDimmed = stringIDToTypeID( "interfaceIconFrameDimmed" );
		var idinterpolationType = stringIDToTypeID( "interpolationType" );
		var idautomaticInterpolation = stringIDToTypeID( "automaticInterpolation" );
		desc16.putEnumerated( idinterfaceIconFrameDimmed, idinterpolationType, idautomaticInterpolation );
		executeAction( idimageSize, desc16, DialogModes.NO );
	}
}

function crop_to(crop_bounds,safe_area){ // takes bounds
	if(safe_area == 'undefined'||safe_area==null){safe_area = 0}
	var _crop = [crop_bounds[0]-safe_area,crop_bounds[1]-safe_area,crop_bounds[2]+safe_area,crop_bounds[3]+safe_area];
	var final_crop = Array()
	for (var x =0; x < 4; x++){ // constrain the crop to the existing canvas
		$.writeln(_crop[x])
		switch(x){
			case 0: // left and top
			case 1:
				if(parseInt(String(_crop[x])) < 0){final_crop.push(UnitValue("0 px"))}
				else{
					final_crop.push(_crop[x]);
				}
				break;
			case 2: // right
				if(_crop[x]> app.activeDocument.width){
					final_crop.push(app.activeDocument.width)
				}else{
					final_crop.push(_crop[x]);
				}
				break;
			case 3: // bottom
				if(_crop[x]>app.activeDocument.height){
					final_crop.push(app.activeDocument.height)
				}else{
					final_crop.push(_crop[x]);
				}
				break;
			default:
				final_crop.push(_crop[x])
		}
		// teh folloinw is replaced by the switch above
		//if (_crop[x]<0){final_crop.push(0)}
		//else{ final_crop.push(_crop[x])}
	}
	$.writeln(final_crop)
	
	app.activeDocument.selection.deselect()
	app.activeDocument.crop(final_crop)
}

function bounds_offset(a,b){
	// compare arrays of [left, top, right, bottom] and return the result
    var ary = Array()
    for(var x = 0; x <4; x++){
        var _a = parseInt(a[x]);
        var _b = parseInt(b[x]);
        var _r = Math.abs(_a-_b);
        ary.push(UnitValue(String(_r)+" pixels"));
    }
	$.writeln('Bounds Offset A: ' + a)
	$.writeln('Bounds Offset B: ' + b)
	$.writeln('Bounds Offset Result: ' + ary)
	return ary
}

function compare_UV_Array(a,b){ // return true if a>b
	var _a = Array();
	var _b = Array();
	for(var x = 0; x<4; x++ ){
		_a.push(parseInt(a[x]) )
        _b.push(parseInt(b[x]) )
	}
	calculate_array_distance(a,b);
	$.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a.sum()/4>_b.sum()/4).toUpperCase() )
	$.writeln(_a.sum())
	$.writeln(_b.sum())
	return(_a.sum()>_b.sum())
	$.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a>_b).toUpperCase() )
	return (_a>_b)
}

function point_distance(t,q){
	//return the distance between two points
	// Math.sqrt(Math.pow((t[0]-q[0]),2)-(Math.pow((t[1]-q[1]),2)));
	var a = t[0]-q[0];
	var b = t[1]-q[1];
	a = Math.pow(a,2)
	b = Math.pow(b,2)
	a = Math.abs(a-b)
	$.writeln(a)
	return Math.sqrt(a)
}

function calculate_array_distance(_t,_q){
	var t = Array()
	var q = Array()
	for(var x = 0; x<4; x++ ){ // remove the unit value assignements
		t.push(parseInt(_t[x].as('px')))
        q.push(parseInt(_q[x].as('px')))
	} // now we have arrays of integers
	// calculate the distance from corner to corner
	var a = point_distance( [t[0],t[1]] , [q[0],q[1]] ); // left top
	var b = point_distance( [t[2],t[1]] , [t[2],t[1]] ); // right top
	var c = point_distance( [t[2],t[3]] , [q[2],q[3]] ); // right bottom 
	var d = point_distance( [t[0],t[3]] , [q[0],q[3]] ); // left bottom
	var r = Array(); // the resulting array
	var temp = [a,b,c,d] // a temporary array to parse NaN from
	for (var x = 0; x <4; x++){  // replace NaN w/ 0
		if (String(temp[x]) == String(NaN)){r.push(0)}
		else{r.push(temp[x])}}
	return r // return an array or integers
}

function closest_path(target){
	$.writeln("Target is: " + target)
	app.activeDocument.selection.deselect()
	var closest_match = {path: null, bounds: null}
	for (var x = 0; x<app.activeDocument.pathItems.length; x++){
		$.writeln('working with ' + app.activeDocument.pathItems[x])
		try{
			app.activeDocument.pathItems[x].makeSelection();
			var cPath_Bounds = app.activeDocument.selection.bounds;
			app.activeDocument.selection.deselect()
		}catch(err){ continue; }
		if(closest_match.path == null) {closest_match.path = app.activeDocument.pathItems[x];closest_match.bounds = cPath_Bounds; continue;}
		// test distance from target for the cPath_Bounds against the closest match bounds
		var distances ={
			cMatch: calculate_array_distance(target,closest_match.bounds),
			cPath: calculate_array_distance(target, cPath_Bounds)
		}
		if(distances.cPath.sum()/4<distances.cMatch.sum()/4){
			$.writeln('New match found: ' + app.activeDocument.pathItems[x] + ' is better match than ' + closest_match.path)
			closest_match.path = app.activeDocument.pathItems[x];
			closest_match.bounds = cPath_Bounds;
		}
	}
    app.activeDocument.selection.deselect();
    $.writeln("Closest Match: " + closest_match.path);
	$.writeln("Closest Match distance from target: " + calculate_array_distance(target, closest_match.bounds));
	$.writeln(target)
	$.writeln(closest_match.bounds)
	$.writeln("Closes match difference is " + [
		target[0]-closest_match.bounds[0],
		target[1]-closest_match.bounds[1],
		target[2]-closest_match.bounds[2],
		target[3]-closest_match.bounds[3],
	])
    return [
		target[0],
		target[1],
		closest_match.bounds[2],
		closest_match.bounds[3]+(target[3]-closest_match.bounds[3])
	]
}

function select_white_area(){
	var idset = stringIDToTypeID( "set" );
	var desc13 = new ActionDescriptor();
	var idnull = stringIDToTypeID( "null" );
	var ref6 = new ActionReference();
	var idchannel = stringIDToTypeID( "channel" );
	var idselection = stringIDToTypeID( "selection" );
	ref6.putProperty( idchannel, idselection );
	desc13.putReference( idnull, ref6 );
	var idto = stringIDToTypeID( "to" );
	var desc14 = new ActionDescriptor();
	var idhorizontal = stringIDToTypeID( "horizontal" );
	var idpixelsUnit = stringIDToTypeID( "pixelsUnit" );
	desc14.putUnitDouble( idhorizontal, idpixelsUnit, 10.000000 );
	var idvertical = stringIDToTypeID( "vertical" );
	var idpixelsUnit = stringIDToTypeID( "pixelsUnit" );
	desc14.putUnitDouble( idvertical, idpixelsUnit, 10.000000 );
	var idpaint = stringIDToTypeID( "paint" );
	desc13.putObject( idto, idpaint, desc14 );
	var idtolerance = stringIDToTypeID( "tolerance" );
	desc13.putInteger( idtolerance, 32 );
	var idmerged = stringIDToTypeID( "merged" );
	desc13.putBoolean( idmerged, true );
	var idantiAlias = stringIDToTypeID( "antiAlias" );
	desc13.putBoolean( idantiAlias, true );
	executeAction( idset, desc13, DialogModes.NO );
	var idinverse = stringIDToTypeID( "inverse" );
    executeAction( idinverse, undefined, DialogModes.NO );
}

function make_mask_selection(){
	try{
		var idchannel = stringIDToTypeID( "channel" );
		var desc70 = new ActionDescriptor();
		var ref9 = new ActionReference();
		ref9.putProperty( idchannel, stringIDToTypeID( "selection" ) );
		desc70.putReference( stringIDToTypeID( "null" ), ref9 );
		var ref10 = new ActionReference();
		ref10.putEnumerated( idchannel, idchannel, stringIDToTypeID( "mask" ) );
		desc70.putReference( stringIDToTypeID( "to" ), ref10 );
		executeAction( stringIDToTypeID( "set" ), desc70, DialogModes.NO );
	}catch(err){
		return null;
	}
	return app.activeDocument.selection;
}

function get_main_mask_bounds(){
	getLayerByName('main', 'LayerSet');
	make_mask_selection();
	return app.activeDocument.selection.bounds;
}

function auto_crop(){
	var source_folder = Folder.selectDialog("Select a folder for images to process")
	var source_files = source_folder.getFiles("*.???")
	var output_folder = Folder.selectDialog("Select an output location for finals")
	for (var x = 0; x < source_files.length; x++){
		if(source_files[x] == ""){ continue; }
		$.writeln("Attempting to open ",source_files[x])
		try{app.open(File(source_files[x]))}catch(err){$.writeln(err);continue}
		try{
			var main_mask_bounds = get_main_mask_bounds()
		}catch(err){ // get the bounds of the main mask if it exists
			var main_mask_bounds = null}
		// remove "crop" paths
		for(var p = 0; p < app.activeDocument.pathItems.length; p++){ if(app.activeDocument.pathItems[p].name.toLowerCase().indexOf('crop')>0){app.activeDocument.pathItems[p].remove()} }
		if(((main_mask_bounds === undefined || main_mask_bounds == null || main_mask_bounds == "undefined") && app.activeDocument.pathItems.length>0)) { // no main mask; has paths
			crop_to_eq_dist_product();
		}else if((main_mask_bounds === undefined || main_mask_bounds == null || main_mask_bounds == "undefined") && app.activeDocument.pathItems.length==0){ // no main mask; no paths
			select_white_area();
			crop_to(app.activeDocument.selection.bounds,crop_boundary)
		}else{ // has main mask
            crop_to_eq_dist_product();
			// alert('Error cropping asset\nA fatal error occured while attempting to crop this asset. Exiting application')
            // break;
		}
		constrain_Image_size(); // set the long-side to 4000px
		// app.activeDocument.flatten(); //// TO DO --- NEED TO REMOVE THIS AND REPLACE W/ THE ABILITY TO MAKE A 3 LAYER TIF
		for(var lc = 0; lc<app.activeDocument.layers.length;lc++){
			var the_layer = app.activeDocument.layers[lc]
			if (the_layer.name.toLowerCase()=="rhr bg"){ the_layer.visible = false}
			if (the_layer.visible == false){the_layer.remove()}
		}
		for(var lc = 0; lc<app.activeDocument.layerSets.length;lc++){
			app.activeDocument.layerSets[lc].remove()
		}
		// var saveOptions = new TiffSaveOptions();
		// saveOptions.alphaChannels = true;
		// saveOptions.transparency = true;
		// saveOptions.imageCompression = TIFFEncoding.TIFFLZW;
		// app.activeDocument.saveAs(new File(output_folder + "/"+ app.activeDocument.name.replace('.psb','.tif')),saveOptions);
		export_png();
		app.activeDocument.close();
	}
    alert('Task complete')
}

function export_png(){
    var user = String(File("~/").displayName);
    var output_folder = new Folder(String('/Users/'+user+"/Desktop/Output")) // the 
    if(!output_folder.exists){output_folder.create()}
    $.writeln(output_folder);
    var export_base_name = app.activeDocument.name.replace(".psb",".png")
    var save_file = File(output_folder + "/" + export_base_name)
    // $.writeln(save_file)
    var options = new ExportOptionsSaveForWeb;
    options.format = SaveDocumentType.PNG;
    options.includeProfile = true;
    options.interlaced = true;
    options.PNG8 = false;
    options.quality = 100;
    options.transparency = true;
    app.activeDocument.exportDocument(save_file,ExportType.SAVEFORWEB, options);
}


function get_product_bounds(wsB){
	// find the bounds of the product by
	// 1) looking for the main mask, return if it exists
	try{
		var main_mask_bounds = get_main_mask_bounds();
		return main_mask_bounds;
	}catch(err){}
	// 2) if no main mask found, compare paths to white space bounds 
	// 		and return bounds of closest match
	// remove "crop" paths
	for(var p = 0; p < app.activeDocument.pathItems.length; p++){ if(app.activeDocument.pathItems[p].name.toLowerCase().indexOf('crop')>0){app.activeDocument.pathItems[p].remove()} }
	select_white_area();
	var res = closest_path(app.activeDocument.selection.bounds);
	app.activeDocument.selection.deselect();
	return res;
}

// define new main function to: 
// 1) Find the white space bounds ( wsB = [left, top, right, bottom])
// 2) Find the product bounds (pB = [left, top, right, bottom])
// 3) Determine the product-to-white distance (DtW) at all sides (this would give us the shadow space) DtW = [left, top, right, bottom]
// 4) Remove DtW values where DtW[x] + pB[x] is outside of canvas bounds 
// 5) Sort remaining DtW and select largest variable
// 6) Set crop bounds (cB) to pB+DtW
function crop_to_eq_dist_product(){
	// 1) Find the white space bounds ( wsB = [left, top, right, bottom])
	select_white_area();
	var wsB = app.activeDocument.selection.bounds;
	app.activeDocument.selection.deselect();
	// 2) Find the product bounds (pB = [left, top, right, bottom])
	var pB = get_product_bounds(wsB);
	// 3) Determine the product-to-white distance (DtW) at all sides (this would give us the shadow space) DtW = [left, top, right, bottom]
	var DtW = [
		pB[0] - wsB[0],  // left
		pB[1] - wsB[1],// top
		wsB[2] - pB[2], // right
		wsB[3] - pB[3],// bottom
	]
	// 4) Remove DtW values where DtW[x] + pB[x] is outside of canvas bounds 
	var t = [];
	if((pB[0] - DtW[0]) > 0 ){t.push(DtW[0])}
	if((pB[1] - DtW[1]) > 0 ){t.push(DtW[1])}
	if((pB[2] + DtW[2]) < parseInt(String(app.activeDocument.width))){t.push(DtW[2])}
	if((pB[3] + DtW[3]) < parseInt(String(app.activeDocument.height))){t.push(DtW[3])}
	DtW = t
	// 5) Sort remaining DtW and select largest variable
	DtW.sort()
	DtW = DtW[DtW.length-1]; // this should be the largest possible space that doesn't push past the canvas
	// 6) Set crop bounds (cB) to pB+DtW
    if (DtW == null || DtW == undefined || DtW < 30) {DtW = 30}
	var crop_bounds = [
		pB[0] - DtW,
		pB[1] - DtW,
		pB[2] + DtW,
		pB[3] + DtW
	]
	crop_to(crop_bounds);
}
auto_crop();