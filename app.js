const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require('sqlite3');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const path = require("path");
const { addAbortListener } = require("events");
const { request } = require("http");
const dbPath = path.join(__dirname, "flowai.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDbServer = async() => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(3000, () => {
            console.log(`server run at http://localhost:3000`)
        });
    }catch(e) {
        console.log(e.message);
    }
} 

initializeDbServer();

//register api 
app.post("/users/", async(request, response) => {
    const {username, name, password, gender, location} = request.body;
    const hashPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
        const addUserQuery = `
            INSERT INTO 
                users (username, name, password, gender, location) 
            VALUES 
                ('${username}', '${name}', '${password}', '${gender}', '${location}');
        `;
        const responseUser = await db.run(addUserQuery);
        response.send(responseUser.lastId);
    }else {
        response.status(400);
        response.send("user already exists");
    }
});

//login user 
app.post("/login", async(request, response) => {
    const {username, password} = request.body;
    const checkUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
    const dbUser = await db.get(checkUserQuery);
    if (dbUser === undefined) {
        response.status(400);
        response.send("user invalid");
    }else {
        const isPsdMatched = await bcrypt.compare(password, dbUser.password);
        if (isPsdMatched) {
            response.send('login successfully')
        }else {
            response.status(400);
            response.send("user invalid");
        }
    }
})

// add transaction 
app.post("/transactions", async(request, response) => {
    try {
        const {id, type, category, amount, date, description} = request.body;
        const addTransactionQuery = `
            INSERT INTO
                transactions (id, type, category, amount, date, description)
            VALUES 
                (${id}, '${type}', '${category}', ${amount}, '${date}', '${description}');
        `;
        const responseDbUser = await db.run(addTransactionQuery);
        response.send(responseDbUser.lastId);
    }catch(e) {
        console.log(e.message);
    }
});

//get all transactions 
app.get("/transactions", async(request, response) => {
    try {
        const getTransactionsAllQuery = `SELECT * FROM transactions;`;
        const reaponseData = await db.all(getTransactionsAllQuery);
        response.send(reaponseData);
    }catch(e) {
        console.log(e.message);
    }
})

//get only particular transaction 
app.get("/transactions/:id", async(request, response) => {
    try {
        const {id} = request.params;
        const getTransactionIdQuery = `SELECT * FROM transactions WHERE id = ${id};`;
        const transactionDetails = await db.get(getTransactionIdQuery);
        response.send(transactionDetails);
    }catch(e) {
        console.log(e.message);
    }
})

//Updates a transaction by ID.
app.put("/transactions/:id", async(request, response) => {
    try {
        const {id} = request.params;
        const {type, category, amount, date, description} = request.body;
        const updateTransactionQuery = `
            UPDATE transactions 
                SET
                    type = '${type}',
                    category = '${category}',
                    amount = ${amount},
                    date = '${date}',
                    description = '${description}'
                WHERE 
                    id = ${id};`;
        const UpdateTransactionDetails = await db.run(updateTransactionQuery);
        response.send('updated transaction successfully');
    }catch(e) {
        console.log(e.message)
    }
});

//Deletes a transaction by ID.
app.delete("/transactions/:id", async(request, response) => {
    try {
        const {id} = request.params;
        const deleteTransactionQuery = `
            DELETE FROM transactions WHERE id = ${id};
        `;
        const deleteTransactionDetails = await db.run(deleteTransactionQuery);
        response.send('delete transaction successfully');
    }catch(e) {
        console.log(e.message);
    }
});

//Retrieves a summary of transactions 
app.get("/summary", async(request, response) => {
    try {
        const sumaryTransactionQuery = `SELECT * FROM transations;`;
        const sumaryDetails = await db.all(sumaryTransactionQuery);
        let totalIncome = 0;
        let totalExpenses = 0
        const result = sumaryDetails.map(eachItem => {
            if (eachItem.type === "income") {
                totalIncome += eachItem.amount;
            }
            else if (eachItem.type === "expense") {
                totalExpenses += eachItem.amount;
            }
        });
        const totalBalance = totalIncome - totalExpenses
        const sumaryDetailsValues = {totalIncome, totalExpenses, totalBalance};
        response.send(sumaryDetailsValues);
    }
    catch(e) {
        console.log(e.message);
    }
})

module.exports = app;