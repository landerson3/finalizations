#include "./auto_crop.jsx"
// need to deal w/ items that don't have shadows i.e. DTL angles


/*
Requires you to be connected to Tundra
Runs on an open file
	File must be in standard RH file format and contain:
		Layerset: Shadow
		Layerset: main
		Layerset: BG
		ArtLayer: orig
	File is expected to have legacy BG on

	Script outputs:
	1 flattened TIF to: /Volumes/Tundra/Web_Retouching_Projects/RHR_Legacy_Background_Finals
	1 layered TIF (Product, Shadow) to ./RHR_TIFs/

User needs to setup action/droplet to run on batch of files
*/



// finalize files for RHR usage
/* this will replace the existing finalization action and provide a final tif that is usable by the DC team as well as all other teams
 */
// var use_path_crop_only = confirm('Path Crop\nDo you wish to crop using only paths? << Not developed') // TO DO

var FINALS_MADE = new Array();

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
			for(var x =0; x < pos.artLayers.length; x ++){
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

function get_main_mask_bounds(){
	getLayerByName('main', 'LayerSet');
	make_mask_selection();
	return app.activeDocument.selection.bounds;
}

function crop_asset(){            //crop the open asset        
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
			//// $.writeln(_crop[x])
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
		//// $.writeln(final_crop)
		
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
		//// $.writeln('Bounds Offset A: ' + a)
		//// $.writeln('Bounds Offset B: ' + b)
		//// $.writeln('Bounds Offset Result: ' + ary)
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
		//// $.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a.sum()/4>_b.sum()/4).toUpperCase() )
		//// $.writeln(_a.sum())
		//// $.writeln(_b.sum())
		return(_a.sum()>_b.sum())
		//// $.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a>_b).toUpperCase() )
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
		//// $.writeln(a)
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
		//// $.writeln("Target is: " + target)
		app.activeDocument.selection.deselect()
		var closest_match = {path: null, bounds: null}
		for (var x = 0; x<app.activeDocument.pathItems.length; x++){
			//// $.writeln('working with ' + app.activeDocument.pathItems[x])
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
				//// $.writeln('New match found: ' + app.activeDocument.pathItems[x] + ' is better match than ' + closest_match.path)
				closest_match.path = app.activeDocument.pathItems[x];
				closest_match.bounds = cPath_Bounds;
			}
		}
		app.activeDocument.selection.deselect();
		//$.writeln("Closest Match: " + closest_match.path);
		//$.writeln("Closest Match distance from target: " + calculate_array_distance(target, closest_match.bounds));
		//$.writeln(target)
		//$.writeln(closest_match.bounds)
		//$.writeln("Closes match difference is " + [
		//     target[0]-closest_match.bounds[0],
		//     target[1]-closest_match.bounds[1],
		//     target[2]-closest_match.bounds[2],
		//     target[3]-closest_match.bounds[3],
		// ])
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
		desc13.putInteger( idtolerance, 3 );
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

	function c_main(){ //Run on the open file
			if(app.activeDocument == null){ return 1; }
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
	c_main();
}

function save_as_tif(_folder,_close, with_layers){
	var saveOptions = new TiffSaveOptions();
	if (with_layers == undefined || with_layers == null){
		saveOptions.layers == false;
	}
	saveOptions.alphaChannels = true;
	saveOptions.transparency = true;
	saveOptions.imageCompression = TIFFEncoding.TIFFLZW;
	var new_file_path = new File(_folder + "/"+ app.activeDocument.name.replace('.psb','.tif'));
	app.activeDocument.saveAs(new_file_path, saveOptions);
	if(_close){app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);}
}

// determine if we need to run this or not << What are the conditions?
// Turn off BG group and replace with a white layer
function add_white_bg(){
	var doc = app.activeDocument;
	// doc.activeLayer = doc.layers.getByName("BG");
	// doc.activeLayer.visible = false;
	// var wlayer = doc.artLayers.add();     // make the layer and name it

	wlayer.name = 'White_BG'; // <<<< What is Seb naming this layer?
	
	return app.activeDocument.activeLayer;
}
// Merge/stamp all layers with a white background.
function merge_layer(new_name){
	var doc = app.activeDocument;
	doc.activeLayer.merge()
	if (new_name != null && new_name != undefined){ doc.activeLayer.name = new_name}
	return app.activeDocument.activeLayer;
}

function make_black_and_white_layer(new_name){
	var doc = app.activeDocument;
	var idMk = charIDToTypeID( "Mk  " );
	var desc308 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref138 = new ActionReference();
	var idAdjL = charIDToTypeID( "AdjL" );
	ref138.putClass( idAdjL );
	desc308.putReference( idnull, ref138 );
	var idUsng = charIDToTypeID( "Usng" );
	var desc309 = new ActionDescriptor();
	var idType = charIDToTypeID( "Type" );
	var desc310 = new ActionDescriptor();
	var idpresetKind = stringIDToTypeID( "presetKind" );
	var idpresetKindType = stringIDToTypeID( "presetKindType" );
	var idpresetKindDefault = stringIDToTypeID( "presetKindDefault" );
	desc310.putEnumerated( idpresetKind, idpresetKindType, idpresetKindDefault );
	var idRd = charIDToTypeID( "Rd  " );
	desc310.putInteger( idRd, 40 );
	var idYllw = charIDToTypeID( "Yllw" );
	desc310.putInteger( idYllw, 60 );
	var idGrn = charIDToTypeID( "Grn " );
	desc310.putInteger( idGrn, 40 );
	var idCyn = charIDToTypeID( "Cyn " );
	desc310.putInteger( idCyn, 60 );
	var idBl = charIDToTypeID( "Bl  " );
	desc310.putInteger( idBl, 20 );
	var idMgnt = charIDToTypeID( "Mgnt" );
	desc310.putInteger( idMgnt, 80 );
	var iduseTint = stringIDToTypeID( "useTint" );
	desc310.putBoolean( iduseTint, false );
	var idtintColor = stringIDToTypeID( "tintColor" );
	var desc311 = new ActionDescriptor();
	var idRd = charIDToTypeID( "Rd  " );
	desc311.putDouble( idRd, 225.000458 );
	var idGrn = charIDToTypeID( "Grn " );
	desc311.putDouble( idGrn, 211.000671 );
	var idBl = charIDToTypeID( "Bl  " );
	desc311.putDouble( idBl, 179.001160 );
	var idRGBC = charIDToTypeID( "RGBC" );
	desc310.putObject( idtintColor, idRGBC, desc311 );
	var idBanW = charIDToTypeID( "BanW" );
	desc309.putObject( idType, idBanW, desc310 );
	var idAdjL = charIDToTypeID( "AdjL" );
	desc308.putObject( idUsng, idAdjL, desc309 );
	executeAction( idMk, desc308, DialogModes.NO );
	if (new_name != null && new_name != undefined){ doc.activeLayer.name = new_name}
	return app.activeDocument.activeLayer;
}

function add_color_fill(rgb){ // accept an array of RGB
	if (rgb == null || rgb == undefined){
		var r = 0;
		var g = 0;
		var b = 0;
	}
	else{
		var r = rgb[0];
		var g = rgb[1];
		var b = rgb[2];
	}
	var idMk = charIDToTypeID( "Mk  " );
	var desc316 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref143 = new ActionReference();
	var idcontentLayer = stringIDToTypeID( "contentLayer" );
	ref143.putClass( idcontentLayer );
	desc316.putReference( idnull, ref143 );
	var idUsng = charIDToTypeID( "Usng" );
	var desc317 = new ActionDescriptor();
	var idType = charIDToTypeID( "Type" );
	var desc318 = new ActionDescriptor();
	var idClr = charIDToTypeID( "Clr " );
	var desc319 = new ActionDescriptor();
	var idRd = charIDToTypeID( "Rd  " );
	desc319.putDouble( idRd, r );
	var idGrn = charIDToTypeID( "Grn " );
	desc319.putDouble( idGrn, g );
	var idBl = charIDToTypeID( "Bl  " );
	desc319.putDouble( idBl, b );
	var idRGBC = charIDToTypeID( "RGBC" );
	desc318.putObject( idClr, idRGBC, desc319 );
	var idsolidColorLayer = stringIDToTypeID( "solidColorLayer" );
	desc317.putObject( idType, idsolidColorLayer, desc318 );
	var idcontentLayer = stringIDToTypeID( "contentLayer" );
	desc316.putObject( idUsng, idcontentLayer, desc317 );
	executeAction( idMk, desc316, DialogModes.NO );


}

function merge_visible(new_name){
	var doc = app.activeDocument;
	var idMrgV = charIDToTypeID( "MrgV" );
	var desc277 = new ActionDescriptor();
	var idDplc = charIDToTypeID( "Dplc" );
	desc277.putBoolean( idDplc, true );
	executeAction( idMrgV, desc277, DialogModes.NO );
	if (new_name != null && new_name != undefined){ doc.activeLayer.name = new_name}
	return app.activeDocument.activeLayer;
}
// Load Red Channel as selection
function load_r_chan_selection(){
	var doc = app.activeDocument;
	var r_chan = doc.channels.getByName('Red')
	doc.selection.load(r_chan,SelectionType.REPLACE)
}
// Invert layer mask
function invert_layer_mask(){
	var idInvs = charIDToTypeID( "Invs" );
	executeAction( idInvs, undefined, DialogModes.NO );
}
// Use selection to add a layer mask to merged/stamped layer
// select merged layer and apply selection as mask
function mask_selection(){
	var idMk = charIDToTypeID( "Mk  " );
	var desc24 = new ActionDescriptor();
	var idNw = charIDToTypeID( "Nw  " );
	var idChnl = charIDToTypeID( "Chnl" );
	desc24.putClass( idNw, idChnl );
	var idAt = charIDToTypeID( "At  " );
	var ref8 = new ActionReference();
	var idChnl = charIDToTypeID( "Chnl" );
	var idChnl = charIDToTypeID( "Chnl" );
	var idMsk = charIDToTypeID( "Msk " );
	ref8.putEnumerated( idChnl, idChnl, idMsk );
	desc24.putReference( idAt, ref8 );
	var idUsng = charIDToTypeID( "Usng" );
	var idUsrM = charIDToTypeID( "UsrM" );
	var idRvlS = charIDToTypeID( "RvlS" );
	desc24.putEnumerated( idUsng, idUsrM, idRvlS );
	executeAction( idMk, desc24, DialogModes.NO );
}

function load_mask_as_selection(){
	// load the current layer's mask as a selection
	app.activeDocument.selection.deselect();
	var idsetd = charIDToTypeID( "setd" );
	var desc47 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref23 = new ActionReference();
	var idChnl = charIDToTypeID( "Chnl" );
	var idfsel = charIDToTypeID( "fsel" );
	ref23.putProperty( idChnl, idfsel );
	desc47.putReference( idnull, ref23 );
	var idT = charIDToTypeID( "T   " );
	var ref24 = new ActionReference();
	var idChnl = charIDToTypeID( "Chnl" );
	var idOrdn = charIDToTypeID( "Ordn" );
	var idTrgt = charIDToTypeID( "Trgt" );
	ref24.putEnumerated( idChnl, idOrdn, idTrgt );
	desc47.putReference( idT, ref24 );
	executeAction( idsetd, desc47, DialogModes.NO );
}
// Mask out prod from layer mask so only the shadow remains. 
function mask_product(){
	var docRef = app.activeDocument;
// store the current layer (the target layer)
	var starting_layer = docRef.activeLayer;
// Get the "MAIN" layerset
	var main_layerset = docRef.layerSets.getByName("main");
	docRef.activeLayer = main_layerset;
// load the mask as a selection
	load_mask_as_selection()
// move back to the starting layer
	docRef.activeLayer = starting_layer;
// apply the selection as a mask
	mask_selection();
}

function move_layer_up(){
	var idmove = charIDToTypeID( "move" );
	var desc98 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref34 = new ActionReference();
	var idLyr = charIDToTypeID( "Lyr " );
	var idOrdn = charIDToTypeID( "Ordn" );
	var idTrgt = charIDToTypeID( "Trgt" );
	ref34.putEnumerated( idLyr, idOrdn, idTrgt );
	desc98.putReference( idnull, ref34 );
	var idT = charIDToTypeID( "T   " );
	var ref35 = new ActionReference();
	var idLyr = charIDToTypeID( "Lyr " );
	var idOrdn = charIDToTypeID( "Ordn" );
	var idNxt = charIDToTypeID( "Nxt " );
	ref35.putEnumerated( idLyr, idOrdn, idNxt );
	desc98.putReference( idT, ref35 );
	executeAction( idmove, desc98, DialogModes.NO );
}

function move_layer_down(){
	var idmove = charIDToTypeID( "move" );
	var desc385 = new ActionDescriptor();
	var idnull = charIDToTypeID( "null" );
	var ref188 = new ActionReference();
	var idLyr = charIDToTypeID( "Lyr " );
	var idOrdn = charIDToTypeID( "Ordn" );
	var idTrgt = charIDToTypeID( "Trgt" );
	ref188.putEnumerated( idLyr, idOrdn, idTrgt );
	desc385.putReference( idnull, ref188 );
	var idT = charIDToTypeID( "T   " );
	var ref189 = new ActionReference();
	var idLyr = charIDToTypeID( "Lyr " );
	var idOrdn = charIDToTypeID( "Ordn" );
	var idPrvs = charIDToTypeID( "Prvs" );
	ref189.putEnumerated( idLyr, idOrdn, idPrvs );
	desc385.putReference( idT, ref189 );
	executeAction( idmove, desc385, DialogModes.NO );
}

function get_shadow_layerSet(){
	// # return the shadow layer
	// layerset parent should be the doc
	// layerset should be visible
	// layerset should contain case insensitive 'shadow'
	
	for (var i = 0 ; i < app.activeDocument.layerSets.length; i++){
		var layer = app.activeDocument.layerSets[i]
		if(layer.name.toLowerCase().indexOf('shadow') < 0){
			continue
		}
		else{
			// contains case insensitive 'shadow'
			if(layer.visible == false){continue}
			else{
				// layer is visible
				return layer
			}
		}
	}

	var possible_shadow_set_names = [
		'shadow',
		'Shadow',
		'RH_ReBG_shadow',
		'RH_ReBG_Shadow'
	]
	for (var x= 0; x< possible_shadow_set_names.length; x++){
		try{
			var shadow_layerset = app.activeDocument.layerSets.getByName(possible_shadow_set_names[x]);
			if (shadow_layerset != undefined){
				return shadow_layerset;
			}
		}catch(err){
		}
	}
	return null;
}


function setup_as_shot_as_transparent(){
	if (app.documents.length == 0){return 1}
	// don't run if the transparent layers are already setup.
	if (app.activeDocument.layers[0].name.toLowerCase() == "product" && app.activeDocument.layers[1].name.toLowerCase() == "shadow"){
		return 0;
	}
	try{app.activeDocument.artLayers.getByName('Product')}catch(err){}
	app.displayDialogs = DialogModes.NO;
	
	try{app.activeDocument.layerSets.getByName('bg').visible = false;} catch(err){
		app.activeDocument.layerSets.getByName('BG').visible = false;
	}


	// select the shadow_layerset and set the visibility to false
	var shadow_layerset = get_shadow_layerSet();
	// if (shadow_layerset == null){ }
	if (shadow_layerset.hasOwnProperty('visible')){shadow_layerset.visible = false;}


	try{app.activeDocument.artLayers.getByName('orig').visible = false;} catch(err){
		try{app.activeDocument.artLayers.getByName('Orig').visible = false;}catch(err){}
		
	}
	app.activeDocument.activeLayer = app.activeDocument.layerSets.getByName('main');
	merge_visible('Product')
	app.activeDocument.activeLayer.visible = false;
	app.activeDocument.layerSets.getByName('main').visible = false;

	// select the shadow_layerset
	app.activeDocument.activeLayer = shadow_layerset;


	add_color_fill([255,255,255]);
	try{ app.activeDocument.activeLayer.isBackgroundLayer = true;}catch(err){
		var stored_layer = app.activeDocument.activeLayer;
		app.activeDocument.activeLayer = app.activeDocument.backgroundLayer;
		app.activeDocument.activeLayer.isBackgroundLayer = false;
		// app.activeDocument.activeLayer = stored_layer;
		// app.activeDocument. 
		stored_layer.isBackgroundLayer = true;
	}
	// try{app.activeDocument.activeLayer = app.activeDocument.layerSets.getByName('Shadow');} catch(err){
	// 	app.activeDocument.activeLayer = app.activeDocument.layerSets.getByName('shadow');
	// }
	shadow_layerset.visible = true;
	merge_visible('shadow_select');
	make_black_and_white_layer('black_and_white');
	load_r_chan_selection();
	app.activeDocument.selection.invert();
	add_color_fill();
	while(app.activeDocument.activeLayer!=app.activeDocument.layers[0]){
		move_layer_up();
	}
	app.activeDocument.activeLayer.name = "Shadow";
	app.activeDocument.activeLayer = app.activeDocument.artLayers.getByName('Product')
		while(app.activeDocument.activeLayer!=app.activeDocument.layers[0]){
		move_layer_up();
	}
	app.activeDocument.artLayers.getByName("shadow_select").remove();
	app.activeDocument.artLayers.getByName("black_and_white").remove();
	app.activeDocument.artLayers.getByName("Background").isBackgroundLayer = false;
	app.activeDocument.artLayers[app.activeDocument.artLayers.length-1].remove();
	app.activeDocument.activeLayer = app.activeDocument.layerSets.getByName("main");
	load_mask_as_selection();
	app.activeDocument.activeLayer = app.activeDocument.artLayers.getByName("Product");
	mask_selection();
	app.activeDocument.layerSets.getByName("main").visible = false;
	shadow_layerset.visible = false;
	return 0;
}

				   
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

function getLayerByName(name, type, pos) {
    if (arguments.length == 1) {
        getLayerByName(arguments[0], "undefined", app.activeDocument);
    }
    if (String(pos) === "undefined") {
        pos = app.activeDocument;
    }
    if (String(type) === "undefined") {
        for (var x = 0; x < pos.artLayers.length; x++) {
            if (pos.artLayers[x].name == name) {
                app.activeDocument.activeLayer = pos.artLayers[x];
                return app.activeDocument.activeLayer;
            }
        }
        for (var c = 0; c < pos.layerSets.length; c++) {
            if (pos.layerSets[c].name == name) {
                app.activeDocument.activeLayer = pos.layerSets[c];
                return app.activeDocument.activeLayer;
            } else {
                var foundLayer = getLayerByName(name, "undefined", pos.layerSets[c]);
                if (foundLayer) return foundLayer;
            }
        }
    } else {
        for (var x = 0; x < pos.artLayers.length; x++) {
            if (pos.artLayers[x].name == name && pos.artLayers[x].typename == type) {
                app.activeDocument.activeLayer = pos.artLayers[x];
                return app.activeDocument.activeLayer;
            }
        }
        for (var c = 0; c < pos.layerSets.length; c++) {
            if ((pos.layerSets[c].name.toLowerCase() == name.toLowerCase() || pos.layerSets[c].name == "RH_ReBG_Shadow") && pos.layerSets[c].typename == type) {
                app.activeDocument.activeLayer = pos.layerSets[c];
                return app.activeDocument.activeLayer;
            } else {
                var foundLayer = getLayerByName(name, type, pos.layerSets[c]);
                if (foundLayer) return foundLayer;
            }
        }
    }
    return null;
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
		//$.writeln(_crop[x])
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
	//$.writeln(final_crop)
	
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
	//$.writeln('Bounds Offset A: ' + a)
	//$.writeln('Bounds Offset B: ' + b)
	//$.writeln('Bounds Offset Result: ' + ary)
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
	//$.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a.sum()/4>_b.sum()/4).toUpperCase() )
	//$.writeln(_a.sum())
	//$.writeln(_b.sum())
	// return(_a.sum()>_b.sum())
	//$.writeln("Comparison for ::\n\t" + String(a) +"\n\t> " + String(b) + "\n\t==\n\t" + String(_a>_b).toUpperCase() )
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
	//$.writeln(a)
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
	//$.writeln("Target is: " + target)
	app.activeDocument.selection.deselect()
	var closest_match = {path: null, bounds: null}
	for (var x = 0; x<app.activeDocument.pathItems.length; x++){
		//$.writeln('working with ' + app.activeDocument.pathItems[x])
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
			//$.writeln('New match found: ' + app.activeDocument.pathItems[x] + ' is better match than ' + closest_match.path)
			closest_match.path = app.activeDocument.pathItems[x];
			closest_match.bounds = cPath_Bounds;
		}
	}
	app.activeDocument.selection.deselect();
	//$.writeln("Closest Match: " + closest_match.path);
	//$.writeln("Closest Match distance from target: " + calculate_array_distance(target, closest_match.bounds));
	//$.writeln(target)
	//$.writeln(closest_match.bounds)
	//$.writeln("Closes match difference is " + [
	// 	target[0]-closest_match.bounds[0],
	// 	target[1]-closest_match.bounds[1],
	// 	target[2]-closest_match.bounds[2],
	// 	target[3]-closest_match.bounds[3],
	// ])
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
	desc13.putInteger( idtolerance, 3 );
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



function crop_open_asset() {
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
		// break;
	}
	constrain_Image_size(); // set the long-side to 4000px}
}







function finalize_file(){

	// 
	// with the active document
	// expect to be left with legacy BG on and no transparent shadow
	// need to add check for previous line <<< Included in Setup_as_shot_as_transparent
	// code the "sebaction" << DONE
	// export legacy tif
	
	var rhr_tif_location = new Folder(String(app.activeDocument.fullName).replace(app.activeDocument.name,"").replace("WIPS","FINAL"));
	var legacy_tif_location = "/Volumes/Tundra/Web_Retouching_Projects/RHR_Legacy_Background_Finals";
	if (DEBUG_MODE){
		var rhr_tif_location = new Folder('~/Desktop/Testing/RHR_Finals/');
		var legacy_tif_location = new Folder('~/Desktop/Testing/Legacy_Finals/');
	}
	// save_as_tif(legacy_tif_location,false,false); // << commented out to allow Asset Management to run file w/o legacy tif creation
	// export the RHR tif
	// setup the transparent file
	setup_as_shot_as_transparent();
	// delete everything that isn't the "Product" or "Shadow" l
	if (!rhr_tif_location.exists){rhr_tif_location.create()}
	function unlock_layers(pos){
		if (pos == undefined){ pos = app.activeDocument; }
		for (var i = 0; i < pos.layerSets.length; i++){
			pos.layerSets[i].allLocked = false
			unlock_layers(pos.layerSets[i]);
		}
		for (var i = 0; i < pos.artLayers.length; i++){
			pos.artLayers[i].allLocked = false
		}
	}
	
	unlock_layers()
	while(app.activeDocument.artLayers.length>2){
		var i = 0;
		while (app.activeDocument.artLayers[i].name == "Product" || app.activeDocument.artLayers[i].name == "Shadow"){ i++; }
		app.activeDocument.artLayers[i].remove();
	}
	while(app.activeDocument.layerSets.length>0){
		var i = 0;
		try{ while (app.activeDocument.layerSets[i].name == "Product" || app.activeDocument.layerSets[i].name == "Shadow"){ i++; } } catch(e){i =0;}
		app.activeDocument.layerSets[i].remove();
	}
	// crop_open_asset();
	auto_crop();
	var name = app.activeDocument.name;
	save_as_tif(rhr_tif_location,true,true);
	FINALS_MADE.push(name.replace('.psb','.tif'));
	// var legacy_tif_file = File(legacy_tif_location+"/"+name);
	// alert(legacy_tif_file);
	// app.open(legacy_tif_file);
	// app.activeDocument.flatten();
	// app.activeDocument.save();
	// app.activeDocument.close();

}



function main(){
	try{
		displayDialogs = DialogModes.NO;
	}
	catch(err){
	}
	try{
		finalize_file()
	}
	catch(err){
		var file = new File(File($.fileName).parent+"/errors.txt")
		var fname = app.activeDocument.name
		app.activeDocument.close(SaveOptions.DONOTSAVECHANGES)
		file.open('a');
		//file.writeln("Error finalizing file: " + fname + ' ' + err);
	}
}

// Set to false when ready for productions
var DEBUG_MODE = false;

// finalize_file()
main();
executeAction(app.charIDToTypeID('quit'), undefined, DialogModes.NO);

finals_doc = File(File($.fileName).parent+"/finals.txt")
finals_doc.open('a')
for(var i = 0 ; i < FINALS_MADE.length;i++){
	//$.writeln(FINALS_MADE[i])
	//finals_doc.writeln(FINALS_MADE[i]);
}