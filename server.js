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
        testSQL();
    }
});

function testSQL() {
    let sql = "SELECT state_name FROM States WHERE state_abbreviation=?";
    db.all(sql, ["MN"], (err, row) =>{
        console.log(row);
        if(row == undefined) {
            //Write404Error(res, "woah");
            console.log("big bad boi");
        }
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
            var arraystring = "";
            for (var key in row) {
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
            response = response.replace("coal_count;", "coal_count = " + data[0]);
            response = response.replace("natural_gas_count", "natural_gas_count = " + data[1]);
            response = response.replace("nuclear_count;", "nuclear_count = " + data[2]);
            response = response.replace("petroleum_count;", "petroleum_count = " + data[3]);
            response = response.replace("renewable_count;", "renewable_count = " + data[4]);
            response = response.replace("DATA_INSERTED_HERE", data[5]);
            WriteHtml(res, response);
        });
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/year/*'
app.get('/year/:selected_year', (req, res) => {
    if(parseInt(req.params.selected_year) > 2017 || parseInt(req.params.selected_year) < 1960) {
        Write404Error(res, "Error: no data for year " + req.params.selected_year);
    }
    else {
        let resources = new Promise((resolve, reject) =>{
            let array = [0, 0, 0, 0, 0, ""];
            db.all("SELECT * FROM Consumption WHERE year="+req.params.selected_year, (err, row)=> {
                if(err) {
                    reject(err);
                }
                var arraystring = "";
                for (var key in row) {
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
                response = response.replace("year;", "year = " + req.params.selected_year);
                response = response.replace("coal_count;", "coal_count = " + data[0]);
                response = response.replace("natural_gas_count", "natural_gas_count = " + data[1]);
                response = response.replace("nuclear_count;", "nuclear_count = " + data[2]);
                response = response.replace("petroleum_count;", "petroleum_count = " + data[3]);
                response = response.replace("renewable_count;", "renewable_count = " + data[4]);
                response = response.replace("DATA_INSERTED_HERE", data[5]);
                response = response.replace("US_ENERGY_CONSUMPTION", req.params.selected_year + " US Energy Consumption");
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
                WriteHtml(res, response);
            });
        }).catch((err) => {
            Write404Error(res);
        });
    }
    
});

// GET request handler for '/state/*'
app.get('/state/:selected_state', (req, res) => {
    db.all("SELECT * FROM States WHERE state_abbreviation=?",[req.params.selected_state], (err, row) =>{
        if(row.length == 0) {
            Write404Error(res, "Error: no data for state " + req.params.selected_state);
        }
    });
    ReadFile(path.join(template_dir, 'state.html')).then((template) => {
        let response = template;
        // modify `response` here

        response = response.replace("PAGE_TITLE", req.params.selected_state + " Energy Consumption" );

        let resources = new Promise((resolve, reject) =>{
            db.all("SELECT * FROM Consumption WHERE state_abbreviation = '"+req.params.selected_state+"';", (err, row) => {//get, all, each (npm sqlite3)
                if (err) {
                    return console.error(err.message);
                }
                resolve(row);
            });
        }).then((result) => {
            var state_array = new Promise((resolve, reject) => {
                db.all("SELECT * From States ORDER BY state_abbreviation", (err, row) =>{
                    if(err) {
                        reject(err);
                    }
                    resolve(row);
                });
            });
            var table_data = "";
            
            for (var key in result){
                table_data = table_data + "<tr><td>"+result[key].year+"</td><td>"+result[key].coal+"</td><td>"+result[key].natural_gas+"</td><td>"+result[key].nuclear+"</td><td>"+result[key].petroleum+"</td><td>"+result[key].renewable+"</td><td>"+(result[key].coal+result[key].natural_gas+result[key].nuclear+result[key].petroleum+result[key].renewable)+"</td></tr>";
            }

            response = response.replace("DATA_TABLE", table_data);

            var script_data = {"coal_counts":[], "natural_gas_counts":[], "nuclear_counts":[], "petroleum_counts":[], "renewable_counts":[]};
            for (var key in result){
                script_data.coal_counts.push(result[key].coal);
                script_data.natural_gas_counts.push(result[key].natural_gas);
                script_data.nuclear_counts.push(result[key].nuclear);
                script_data.petroleum_counts.push(result[key].petroleum);
                script_data.renewable_counts.push(result[key].renewable);
            }
            response = response.replace("state;", 'state="'+req.params.selected_state+'";');
            response = response.replace("coal_counts;", "coal_counts=[" + script_data["coal_counts"]+"];");
            response = response.replace("natural_gas_counts;", "natural_gas_counts=[" + script_data["natural_gas_counts"]+"];");
            response = response.replace("nuclear_counts;", "nuclear_counts=[" + script_data["nuclear_counts"]+"];");
            response = response.replace("petroleum_counts;", "petroleum_counts=[" + script_data["petroleum_counts"]+"];");
            response = response.replace("renewable_counts;", "renewable_counts=[" + script_data["renewable_counts"]+"];");

            response = response.replace('src="/images/noimage.jpg" alt="No Image"', 'src="/images/' + req.params.selected_state + '.png" alt="' + req.params.selected_state + '"');
            state_array.then((data) => {
                let number = 0;
                while(number != data.length && req.params.selected_state != data[number].state_abbreviation) {
                    number = number + 1;
                }
                response = response.replace("PAGE_HEADER", data[number].state_name);
                if(req.params.selected_state == "WY") {
                    response = response.replace("XX", "WV");
                    response = response.replace("YY", "AK");
                    response = response.replace("PREV_LINK", "/state/WV");
                    response = response.replace("NEXT_LINK", "/state/AK");
                }
                else if(req.params.selected_state == "AK") {
                    response = response.replace("XX", "WY");
                    response = response.replace("YY", "AL");
                    response = response.replace("PREV_LINK", "/state/WY");
                    response = response.replace("NEXT_LINK", "/state/AL");
                }
                else {
                    response = response.replace("XX", data[number - 1].state_abbreviation);
                    response = response.replace("YY", data[number + 1].state_abbreviation);
                    response = response.replace("PREV_LINK", "/state/" + data[number - 1].state_abbreviation);
                    response = response.replace("NEXT_LINK", "/state/" + data[number + 1].state_abbreviation);
                }
                WriteHtml(res, response);
            });
        });
        
    }).catch((err) => {
        Write404Error(res);
    });
});

// GET request handler for '/energy-type/*'
app.get('/energy-type/:selected_energy_type', (req, res) => {
    var button_array = ["coal", "natural_gas", "nuclear", "petroleum", "renewable"];
    let error = true;
    for(let i in button_array) {
        if(req.params.selected_energy_type == button_array[i] && error == true) {
            error = false;
        }
    }
    if(error){
        Write404Error(res, "Error: no data for energy type " + req.params.selected_energy_type);
    }
    else {
        ReadFile(path.join(template_dir, 'energy.html')).then((template) => {
            let response = template;
            let energy_type = req.params.selected_energy_type;
            // modify `response` here
            response = response.replace("Consumption Snapshot", energy_type.charAt(0).toUpperCase() + energy_type.substring(1).replace("_", " ") + " Consumption Snapshot" );
            response = response.replace("var energy_type", "var energy_type='"+req.params.selected_energy_type+"'" );

            let resources = [];
            var state = {AK:[], AL:[], AR:[], AZ:[], CA:[], CO:[], CT:[], DC:[], DE:[], FL:[], GA:[], HI:[], IA:[], ID:[], IL:[], IN:[], KS:[], KY:[], LA:[], MA:[], MD:[], ME:[], MI:[], MN:[], MO:[], MS:[], MT:[], NC:[], ND:[], NE:[], NH:[], NJ:[], NM:[], NV:[], NY:[], OH:[], OK:[], OR:[], PA:[], RI:[], SC:[], SD:[], TN:[], TX:[], UT:[], VA:[], VT:[], WA:[], WI:[], WV:[], WY:[]};
            for (var key in state){
                var year;
                for (year = 1960; year < 2018; year++){
                    let p = new Promise((resolve, reject) =>{
                        db.all("SELECT "+req.params.selected_energy_type+",state_abbreviation FROM Consumption WHERE year="+year+ " AND state_abbreviation='"+key+"';", (err, row)=> {
                            if(err) {
                                reject(err);
                                
                            }
                            resolve({state:row[0]["state_abbreviation"], count: row[0][req.params.selected_energy_type]});
                        });
                    });
                    resources.push(p);
                }
            }
            Promise.all(resources).then((results) => {
                for (var key in state){
                    for (i = 0; i < results.length; i++){
                        if (results[i].state === key){
                            state[key].push(results[i].count);
                        }
                    }
                }
                response = response.replace("var energy_counts", "var energy_counts= " + JSON.stringify(state));

                var table_data;
                var row_data;
                let energy_number = 0;
                table_data = "";
                var energy_array = ["Coal", "Natural Gas", "Nuclear", "Petroleum", "Renewable"];
                for (i = 0; i < 58; i++){
                    let curYear = 1960+i;
                    let total = 0;
                    row_data = "<tr><td>"+ curYear +"</td>";
                    for (var key in state){
                        row_data = row_data+"<td>"+ state[key][i] +"</td>"
                        total = total + state[key][i]
                    }
                    row_data = row_data + "<td>"+ total +"</td></tr>"
                    table_data = table_data + row_data;
                }
                while(energy_number != button_array.length && req.params.selected_energy_type != button_array[energy_number]) {
                    console.log(energy_array);
                    energy_number = energy_number + 1;
                }
                response = response.replace("<!-- Data to be inserted here -->", table_data);
                response = response.replace('src="/images/noimage.jpg" alt="No Image"', 'src="/images/' + req.params.selected_energy_type + '.png" alt="' + req.params.selected_energy_type + '"');
                if(energy_number == 0) {
                    response = response.replace("XX", energy_array[4]);
                    response = response.replace("PREV_LINK", "/energy-type/" + button_array[4]);
                    console.log("Hello1");
                    console.log(energy_number);
                }
                else {
                    response = response.replace("XX", energy_array[(energy_number - 1)]);
                    response = response.replace("PREV_LINK", "/energy-type/" + button_array[(energy_number - 1)]);
                    console.log("Hello2");
                    console.log(energy_number);
                }
                response = response.replace("YY", energy_array[(energy_number + 1)%5]);
                response = response.replace("NEXT_LINK", "/energy-type/" + button_array[(energy_number + 1)%5]);
                //console.log(response);
                WriteHtml(res, response);
            });
            
    }).catch((err) => {
        Write404Error(res);
    });
    }

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
    res.write('Error: File not found.');
    res.end();
}

function Write404Error(res, msg) { //added msg param in order to change message of error, overloading other function
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write(msg);
    res.end();
}

function WriteHtml(res, html) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(html);
    res.end();
}

var server = app.listen(port);
