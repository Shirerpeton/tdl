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
			return true;
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

db.getUsersOfTheProject = async projectId => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'select u."username" from "usersProjects" as up join "users" as u on (up."username" = u."username") join "projects" as p on (up."projectId" = p."projectId" and p."projectId" = $1)',
				values: [projectId]
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
};

db.addUserToTheProject = async (username, projectId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
			text: 'insert into "usersProjects" ("username", "projectId") values ($1, $2)',
			values: [username, projectId]
			}
			await client.query(query);
			return true;
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

db.deleteUserFromTheProject = async(username, projectId) => {
	try {
		const client = await db.pool.connect();
		try {
			let query = {
				text: 'select * from "usersProjects" where "projectId" = $1',
				values: [projectId]
			};
			const {rows} = await client.query(query);
			try {
				await client.query('BEGIN');
				query = {
					text: 'delete from "usersProjects" where ("username" = $1 and "projectId" = $2)',
					values: [username, projectId]
				};
				await client.query(query);
				if (rows.length > 1) {
					await client.query('COMMIT');
				} else {
					query = {
						text: 'delete from "tasks" where "projectId" = $1',
						values: [projectId]
					};
					await client.query(query);
					await client.query('COMMIT');
				}
			} catch (err) {
				await client.query('ROLLBACK');
				throw (err);
			}
		} catch (err) {
			throw (err);
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
};

db.getTasksOfTheProject = async (projectId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'select * from tasks where ("projectId" = $1)',
				values: [projectId]
			};
			const {rows} = await client.query(query);
			return rows;
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

db.addTask = async (taskName, projectId, currentDate, priority) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'insert into "tasks" ("taskName", "projectId", "dateOfAdding", "priority", "completed") values ($1, $2, $3, $4, false) returning "taskId"',
				values: [taskName, projectId, currentDate, priority]
			};
			await client.query(query);
		} catch (err) {
			throw (err);
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

db.deleteTask = async (taskId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'delete from "tasks" where ("taskId" = $1)',
				values: [taskId]
			};
			await client.query(query);
		} catch (err) {
			throw err;
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

db.isTaskInTheProject = async (taskId, projectId) => {
	try {
		const client = await db.pool.connect();
		try {
			const query = {
				text: 'select * from "tasks" where ("taskId" = $1 and "projectId" = $2)',
				values: [taskId, projectId]
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

db.changeTask = async (task) => {
	try {
		const client = await db.pool.connect();
		try {
			let query = {
				text: 'select * from "tasks" where ("taskId" = $1)',
				values: [task.taskId]
			};
			const {rows} = await client.query(query);
			const taskName = (task.taskName !== undefined) ? task.taskName : rows[0].taskName;
			const priority = (task.priority !== undefined) ? task.priority : rows[0].priority;
			const completed = (task.completed !== undefined) ? task.completed : rows[0].completed;
			query = {
				text: 'update "tasks" set "taskName" = $1, "priority" = $2, "completed" = $3 where ("taskId" = $4)',
				values: [taskName, priority, completed, task.taskId]
			};
			await client.query(query);
			return true;
		} catch (err) {
			throw err;
		} finally {
			client.release();
		}
	} catch (err) {
		console.log(err);
		throw err;
	}
}

module.exports = db;