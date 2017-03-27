var webPage = require('webpage');
var system = require('system');
var fs = require('fs');
var md5 = require('./md5.js');

var verbose = false;

var urls = [];
var results = [];

var count = 0;
var maxCount = 10;
var outputFile = ""

function generateGUID() {
	function S4() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
	}
	return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

var args = system.args;

if (args.length === 1) {
	console.log("USAGE: args[0]: -f=inputfile|-u=url [-o=outputfile] [-v]");
	phantom.exit();
}


args.forEach(function(arg, i) {
	if(i > 0) {
		var a = arg.split('=');
		switch(a[0]) {
			case "-u":
				urls.push(a[1]);
				break;
			case "-f":
				if(fs.isFile(a[1]) && fs.isReadable(a[1])) {
					var stream = fs.open(a[1], 'r');
					while(!stream.atEnd()) {
						var line = stream.readLine();
						urls.push(line);
					}
					stream.close();
				}
				else {
					console.log("file must exist and be readable");
					phantom.exit();
				}
				break;
			case "-o":
				console.log("output file specified");
				//if(fs.isWritable(a[1])) {
					console.log("opening output file");
					outputFile = fs.open(a[1], 'w');
				//}
				break;
			case "-v":
				verbose = true;
				break;
		}

	}
	
});

console.log("out of arguments");
if(urls.length === 0) {
	console.log("no urls specified");
	phantom.exit();
}


setInterval(function() {
	if(count < maxCount) {  //try to limit the number of open pages to under maxCount
		if(urls.length > 0) {

			count++;

			var url = urls.pop();
			var resources = [];
			var page = webPage.create();
			var result = {};


			page.onResourceReceived = function(response) {
				if(verbose) {
					console.log(response.url+"\t"+response.status+":"+response.statusText);
				}

				// check if the resource is done downloading 
				if (response.stage !== "end") return;

				if(response.url === url) {
					headers = response.headers;
					response.headers.forEach(function(header) {
						switch(header.name.toLowerCase()) {
							case "server":
								//console.log("setting server to"+header.value);
								result['server'] = header.value;
								break;
							case 'x-frame-options':
								//console.log("found X-Frame-Options: "+header.value);
								break;
							case "set-cookie":
								//console.log("found cookie: "+header.value);
								break;
							case 'cache-control':
								//console.log("found Cache-Control: "+header.value);
								break;
						}
						//console.log(header.name+":"+header.value);
					});
				}
			    resources.push({"url": response.url, "status": response.status});
			};

			page.open(url, function(status){
				console.log(url+":"+status);
				if(status == "success") {
					//take screenshot
					var imageGUID = generateGUID()+".png";
					page.render("images/"+imageGUID);
					result['image'] = imageGUID;

					//get title
					var title = page.evaluate(function() {
						return document.title;
					});
					result['title'] = title;

					//calculate md5sum of page content
					result['md5'] = md5.md5(page.content);

					//get forms in page
					var forms = [];
					forms = page.evaluate(function() {
						var formArray = [];
						var formElements = document.forms;
						for(var i = 0; i < formElements.length; i++) {
							formArray.push({"name": formElements[i].name,
											"action": formElements[i].action,
											"method": formElements[i].method
							});
						}
						return formArray;
					});
					result['forms'] = forms;
				}

				//headers are collected in onResourceRecieved, put these in the results
				result['headers'] = headers;

				//resources are collected in onResourceRecieved, put these in the results
				result['resources'] = resources;

				//get the response status from the first entry in resources, which should be the page we tried to load
				result['responseStatus'] = resources[0].status;

				//get the url
				result['url'] = url;

				//get the cookies
				result['cookies'] = page.cookies;

				results.push(result);
				page.close();
				count--;
			});
		}
	}
	else {
		console.log("still waiting on a response so sleeping... "+count+" active requests, "+urls.length+" items to be scanned.");
	}

}, 1000);

setInterval(function() {
	if(count==0 && urls.length ==0) {
		if(outputFile != "") {
			outputFile.write(JSON.stringify(results));
		}
		else {
			console.log(JSON.stringify(results));			
		}

		phantom.exit();
	}
	else {
		console.log("still waiting on a response so sleeping... "+count+" active requests, "+urls.length+" items to be scanned.");
	}
}, 500);