// Built-in Node.js modules
var fs = require('fs');
var path = require('path');

// NPM modules
var express = require('express');
var sqlite3 = require('sqlite3');


var public_dir = path.join(__dirname, 'public');
var template_dir = path.join(__dirname, 'templates');
var db_filename = path.join(__dirname, 'db', 'usenergy.sqlite3');

var app = express();
var port = 8000;

// open usenergy.sqlite3 database
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
        TestSQL();
    }
});

function TestSQL(){
    let sql = `SELECT state_name
            FROM States`;

    let sql2 = 'PRAGMA table_info(States)';
    //order by, where, from, select

    //use ? marks to subsitute parameters, security reasons
    db.all("SELECT * FROM Consumption WHERE year=2017", (err, row) => {//get, all, each (npm sqlite3)
        if (err) {
            return console.error(err.message);
        }
		/*
        for(i = 0; i < 50; i++) {
            console.log(row[i]);
        }
		*/
        //console.log(row);
        //console.log("done");
    });
}
            
app.use(express.static(public_dir));


// GET request handler for '/'
app.get('/', (req, res) => {
    let resources = new Promise((resolve, reject) =>{
        let array = [0, 0, 0, 0, 0, ""];
        db.all("SELECT * FROM Consumption WHERE year=2017", (err, row)=> {
            if(err) {
                reject(err);
            }
            //console.log(row);
            var arraystring = "";
            for (var key in row) {
                //console.log(key);
                array[0] = array[0] + row[key].coal;
                array[1] = array[1] + row[key].natural_gas;
                array[2] = array[2] + row[key].nuclear;
                array[3] = array[3] + row[key].petroleum;
                array[4] = array[4] + row[key].renewable;
                arraystring = arraystring + "<tr>\n" + "<td>" + row[key].state_abbreviation + "</td>\n" + "<td>" + row[key].coal + "</td>\n" + "<td>" + row[key].natural_gas + "</td>\n" + "<td>" + row[key].nuclear + "</td>\n"+ "<td>" + row[key].petroleum + "</td>\n" + "<td>" + row[key].renewable + "</td>\n" + "</tr>\n";
            }
            array[5] = arraystring;
            resolve(array);
        });
    });
    ReadFile(path.join(template_dir, 'index.html')).then((template) => {
        let response = template;
        // modify `response` here
        resources.then((data)=>{
            //console.log(data);
            response = response.replace("coal_count;", "coal_count = " + data[0]);
            response = response.replace("natural_gas_count", "natural_gas_count = " + data[1]);
            response = response.replace("nuclear_count;", "nuclear_count = " + data[2]);
            response = response.replace("petroleum_count;", "petroleum_count = " + data[3]);
            response = response.replace("renewable_count;", "renewable_count = " + data[4]);
            response = response.replace("DATA_INSERTED_HERE", data[5]);
            //console.log(response);
            WriteHtml(res, response);
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    if(parseInt(req.params.selected_year) > 2017 || parseInt(req.params.selected_year) < 1960) {
        Write404Error(res); //need to figure out how to add the year to the error
    }
    else {
        let resources = new Promise((resolve, reject) =>{
            let array = [0, 0, 0, 0, 0, ""];
            db.all("SELECT * FROM Consumption WHERE year="+req.params.selected_year, (err, row)=> {
                if(err) {
                    reject(err);
                }
                //console.log(row);
                var arraystring = "";
                for (var key in row) {
                    //console.log(key);
                    array[0] = array[0] + row[key].coal;
                    array[1] = array[1] + row[key].natural_gas;
                    array[2] = array[2] + row[key].nuclear;
                    array[3] = array[3] + row[key].petroleum;
                    array[4] = array[4] + row[key].renewable;
                    arraystring = arraystring + "<tr>\n" + "<td>" + row[key].state_abbreviation + "</td>\n" + "<td>" + row[key].coal + "</td>\n" + "<td>" + row[key].natural_gas + "</td>\n" + "<td>" + row[key].nuclear + "</td>\n"+ "<td>" + row[key].petroleum + "</td>\n" + "<td>" + row[key].renewable + "</td>\n" + "<td>" + (array[0] + array[1] + array[2] + array[3] + array[4]) + "</td>\n" + "</tr>\n";
                }
                array[5] = arraystring;
                resolve(array);
            });
        });
        ReadFile(path.join(template_dir, 'year.html')).then((template) => {
            let response = template;
            // modify `response` here
            resources.then((data)=>{
                //console.log(data);
                response = response.replace("year;", "year = " + req.params.selected_year);
                response = response.replace("coal_count;", "coal_count = " + data[0]);
                response = response.replace("natural_gas_count", "natural_gas_count = " + data[1]);
                response = response.replace("nuclear_count;", "nuclear_count = " + data[2]);
                response = response.replace("petroleum_count;", "petroleum_count = " + data[3]);
                response = response.replace("renewable_count;", "renewable_count = " + data[4]);
                response = response.replace("DATA_INSERTED_HERE", data[5]);
                response = response.replace("NATIONAL_SNAPSHOT", req.params.selected_year + " National Snapshot");
                if(req.params.selected_year == 1960) {
                    response = response.replace("PREVIOUS_LINK", "/year/" + req.params.selected_year);
                    response = response.replace("NEXT_LINK", "/year/" + (parseInt(req.params.selected_year) + 1));
                }
                else if(req.params.selected_year == 2017) {
                    response = response.replace("PREVIOUS_LINK", "/year/" + (parseInt(req.params.selected_year) - 1));
                    response = response.replace("NEXT_LINK", "/year/" + req.params.selected_year);
                }
                else {
                    response = response.replace("PREVIOUS_LINK", "/year/" + (parseInt(req.params.selected_year) - 1));
                    response = response.replace("NEXT_LINK", "/year/" + (parseInt(req.params.selected_year) + 1));
                }
                //console.log(response);
                WriteHtml(res, response);
            });
        }).catch((err) => {
            Write404Error(res);
        });
    }
    
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
        let response = template;
        // modify `response` here
        WriteHtml(res, response);
    }).catch((err) => {
        Write404Error(res);
    });
});

function ReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data.toString());
            }
        });
    });
}

function Write404Error(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: file not found');
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}


var server = app.listen(port);
