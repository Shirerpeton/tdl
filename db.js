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

db.createUser = async (login, hash) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'insert into users ("username", "passwordHash") values ($1, $2)',
				values: [login, hash]
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

db.getProjectsOfUser = async username => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'select p."projectName", p."projectId" from "usersProjects" as up inner join "users" as u on (u."username" = up."username" and u."username" = $1) inner join "projects" as p on (p."projectId" = up."projectId")',
				values: [username]
			}
			const {rows} = await client.query(query);
			return rows;
		} catch (err){
			throw err;
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

db.createNewProject = async (user, projectName) => {
	try {
		const client = await db.pool.connect();
		try {
			await client.query('BEGIN');
			let query = {
				text: 'insert into "projects" ("projectName") values ($1) returning "projectId"',
				values: [projectName]
			};
			const {rows} = await client.query(query);
			query = {
				text: 'insert into "usersProjects" ("username", "projectId") values ($1, $2)',
				values: [user, rows[0].projectId]
			};
			await client.query(query);
			await client.query('COMMIT');
		} catch (err) {
			client.query('ROLLBACK');
			throw (err);
		} finally {
			client.release();
		}		
	} catch (err) {
		console.log(err);
		throw err;
	}
}

db.isUserInTheProject = async (username, projId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'select * from "usersProjects" where ("username" = $1 and "projectId" = $2)',
				values: [username, projId]
			}
			const {rows} = await client.query(query);
			return (rows.length !== 0);
		} catch (err){
			throw err;
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

db.deleteProject = async (projectId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'delete from "projects" where "projectId" = $1',
				values: [projectId]
			};
			await client.query(query);
		} catch (err) {
			throw(err);
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}


module.exports = db;