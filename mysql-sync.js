
const Mysql = require('sync-mysql')
  
const connection = new Mysql({
    host:'localhost',
    user:'root',
    password:'maria1',
    database:'training'
})
  
var result = connection.query('SELECT * FROM users');

result.forEach ((row)=>{
	console.log(row.username);
})