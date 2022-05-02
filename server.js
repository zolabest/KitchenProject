var express = require("express");
const bodyParser = require('body-parser');
const fs = require("fs");
const sqlite3 = require('sqlite3');
var session = require('express-session');

const dbFilePath = "products.db";
db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
        console.log('Could not connect to database', err)
    } else {
        console.log('Connected to database')
    }
})
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'XASDASDA' }));
var ssn;
app.use(express.static('public'));
app.get("/hello", (req, res) => {
    res.send("hello");
});
app.get("/admin", (req, res) => {
    ssn = req.session;
    const user = ssn.user;
    if (user == null) {
        res.redirect("/login");
    } else {
        res.sendFile(__dirname + '/public/admin.html');
    }
});
app.get("/deleteProduct/:id", (req, res) => {
    ssn = req.session;
    const user = ssn.user;
    if (user == null) {
        res.end({ status: -1, message: "Not logged in" });
        //    return;
    }
    const id = req.params.id;
    db.run("DELETE FROM products WHERE id=" + id);

    res.send({ status: 1, message: "Item deleted" });
});
app.post("/addProduct", (req, res) => {
    ssn = req.session;
    const user = ssn.user;
    if (user == null) {
        res.end({ status: -1, message: "Not logged in" });
        //    return;
    }
    console.log("BODY", req.body);
    const desc = req.body.description;
    const price = req.body.price;
    const cat = req.body.category;
    console.log(desc, price, cat);
    db.run('INSERT INTO products(description, price, category_id) VALUES(?, ?,?)', [desc, price, cat], (err) => {
        if (err) {
            console.log(err.message);
            res.send({ status: -1, message: "Error adding product" });
            return;
        }
        res.send({ status: 1, message: "Product Added" });
        //console.log('Row was added to the table: ${this.lastID}');
    })
});
app.get("/products", (req, res) => {
    console.log("products");
    db.all("SELECT * FROM products", (error, rows) => {
        res.send(rows);
    });
});
app.post("/pay", (req, res) => {
    const creditCard = req.body.creditCard;
    ssn = req.session;
    let cart = ssn.cart;
    ssn.paid = cart;
    ssn.cart = null;
    res.sendFile(__dirname + '/public/confirmation.html');
});
app.post("/addItem", (req, res) => {
    const body = req.body;
    const id = body.id;
    const qty = body.qty;
    console.log("Add: " + id);
    ssn = req.session;
    let cart = ssn.cart;
    console.log("CART: ", cart);
    if (!cart) {
        cart = [];
    }
    cart.push({ id: id, qty: qty });
    ssn.cart = cart;
    res.send({ status: 1, message: "product added" });
});
app.get("/cart", (req, res) => {
    ssn = req.session;
    let cart = ssn.cart;
    res.send(cart);
});
app.get("/checkout", (req, res) => {

    res.sendFile(__dirname + '/public/checkout.html');

});
app.get("/checkoutCart", (req, res) => {
    ssn = req.session;
    let cart = ssn.cart;
    showItems(res, cart);
});
app.get("/itemsPaid", (req, res) => {
    ssn = req.session;
    let cart = ssn.paid;
    showItems(res, cart);
});

function showItems(res, items) {
    let inList = "(";
    for (let i in items) {
        inList += (i > 0 ? "," : "") + (items[i].id);
    }
    inList += ")";
    const query = "SELECT *, 0 as qty FROM products WHERE id IN " + inList;
    console.log(query);
    db.all(query, (error, rows) => {
        for (let i in rows) {
            let qty = 0;
            for (let j in items) {
                if (rows[i].id == items[j].id) {
                    qty = items[j].qty;
                    break;
                }
            }
            rows[i].qty = qty;
        }
        res.send(rows);
    });
    //res.send(cart);
}
app.get("/products/:desc", (req, res) => {
    const desc = "%" + req.params.desc + "%";
    console.log("products: " + desc);
    db.all("SELECT * FROM products WHERE description LIKE ?", [desc], (error, rows) => {
        res.send(rows);
    });
});
app.get("/product/:id", (req, res) => {
    const id = req.params.id;
    console.log("product.id: " + id);
    db.all("SELECT * FROM products WHERE id= " + id, (error, rows) => {
        res.send(rows);
    });
});
app.get('/', function(req, res) {
    ssn = req.session;
    res.sendFile('index.html');
});
//res.end(cookies);
app.get("/login", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<h3>Login:</h3><form action="login" method="post">');
    res.write('Username: <input type="text" name="username" placeholder="username"><br/><br/>');
    res.write(' Password: &nbsp;<input type="password" name="password" placeholder="password"><br/>');
    res.write('<p><input type="submit" value="Login"></p>');
    res.write('</form>');
    res.end();
});
app.get("/password", (req, res) => {
    ssn = req.session;
    const user = ssn.user;
    if (user == null) {
        res.end({ status: -1, message: "Not logged in" });
        //    return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<h3>Login:</h3><form action="password" method="post">');

    res.write(' Password: &nbsp;<input type="password" name="password" placeholder="password"><br/>');
    res.write('<p><input type="submit" value="Change Password"></p>');
    res.write('</form>');
    res.end();
});
app.post("/password", (req, res) => {
    ssn = req.session;
    const user = ssn.user;
    if (user == null) {
        res.end({ status: -1, message: "Not logged in" });
        //    return;
    }
    const password = req.body.password;
    db.all("UPDATE users SET password = ? WHERE username = ?", password, user.username, (error, rows) => {
        if (error) {
            console.log(error);
            res.send("error");
            return;
        } else {
            if (user.role_id == 1) {
                res.redirect("/admin");
            } else {
                res.redirect("/");
            }
        }

    });
});
app.post("/login", (req, res) => {
    const user = {
        user_id: 0,
        username: req.body.username,
        password: req.body.password,
        role_id: 0
    };
    console.log("user:", user)
    ssn = req.session;
    db.all("SELECT * FROM users WHERE username = ?", user.username, (error, rows) => {
        if (error) {
            console.log(error);
            res.send("error");
            return;
        }
        console.log("rows", rows);
        // res.send(rows);

        if (user.password == rows[0].password) {
            user.user_id = rows[0].user_id;
            user.role_id = rows[0].role_id;
            user.password = "";
            ssn.user = user;
            if (user.role_id === 1)
                res.redirect("/admin");
            else
                res.redirect("/");
        } else {
            res.redirect("/login");
        }
    });

    //res.cookie('user', user.username).send("logged in");
    //res.json(user);

});

const PORT = 4001; //process.env.PORT || 4000;
console.log("about to start");
app.listen(PORT, () => {
    console.log("ok on port: " + PORT);
});