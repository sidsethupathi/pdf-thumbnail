var Hapi = require('hapi'),
	Joi  = require('joi'),
	fs = require('fs'),
	exec = require('child_process').exec,
	sys = require('sys');

var HOST = "http://localhost:8000/";

var server = new Hapi.Server('0.0.0.0', '8000');

var convert = function(request, reply) {
	var req_id = request.id,
		full_path = request.payload.path,
		clean_path = full_path.replace(" ", "%20"),
		filename = full_path.split("/").pop(),
		file_no_ext = filename.split(".")[0];

	exec("cd temp && curl -o " + req_id + " " + clean_path, function(error, stdout, stderr) {
		if(error === null) {
			console.log("PDF file downloaded");
			exec("mkdir thumbs/" + req_id + "" + " && convert -thumbnail x300 temp/" + req_id + " 'thumbs/" + req_id + "/" + file_no_ext + "_thumb_%d.png'", function(error, stdout, stderr) {
				if(error === null) {
					console.log("Thumbnails created...");
					exec("identify -format %n temp/" + req_id, function(error, stdout, stderr) {
						if(error === null) {
							var num_pages = stdout;
							urls = [];

							for(var i = 0; i < num_pages; i++) {
								urls[i] = HOST + "thumbs/" + req_id + "/" + file_no_ext + "_thumb_" + i + ".png";
							}

							console.log("URLs generated...");


							reply({
								name: filename,
								urls: urls
							});

							exec("rm temp/" + req_id, function(error, stdout, stderr) {
								console.log("Removing the pdf file...");
							});
						} else {
							reply({
								status: 400,
								message: "Something went wrong while generating URLs"
							});
						}
					});
				} else {
					reply({
						status: 400,
						message: "Something went wrong while creating thumbnails"
					});
				}
			});
		} else {
			reply({
				status: 400,
				message: "Something went wrong while downloading source file"
			});
		}
		
		
	});
	
};

server.route({
	method: 'POST',
	path: '/convert',
    handler: convert
});

server.route({
	method: 'GET',
	path: '/thumbs/{param*}',
	handler: {
		directory: {
			path: "thumbs"
		}
	}
});

server.route({
	method: 'GET',
	path: '/pdfs/{param}',
	handler: {
		directory: {
			path: "pdfs"
		}
	}
});

server.start();
console.log('Server Started On localhost:8000');
