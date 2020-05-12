'use strict'

const {Pool} = require('pg');
const {config} = require('./config.js')

let db = {};

db.pool = new Pool(config)

db.getUser = async username => {
	try {
		const client = await db.pool.connect();
		try {
			const {rows} = await client.query('select * from "users" where "username" = $1', [username]);
			return (rows[0] !== undefined) ? rows[0] : null;
		} catch (err) {
			throw err;
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
};

db.createUser = async (user) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'insert into users ("username", "passwordHash") values ($1, $2)',
				values: [user.login, user.hash]
			}
			return await client.query(query);
		} catch (err) {
				throw err;
		} finally {
			client.release();
		}	
	} catch (err) {
		throw err;
	}				
}


module.exports = db;