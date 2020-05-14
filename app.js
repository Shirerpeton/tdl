'use strict';

const moment = require('moment');

const bcrypt = require('bcryptjs');
const saltRounds = 8;

const yup = require('yup');

const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-generic-session');
const cors = require('@koa/cors');

const db = require('./db.js')

const signupSchema = yup.object().shape({
	login: yup.string().required('Login must not be empty'),
	password: yup.string().min(4, 'Password must be at least 4 characters long').max(50, 'Password can\'t be more than 50 characters long').required('Password must not be empty'),
});

const loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

const projectSchema = yup.object().shape({
	projectName: yup.string().max(20, 'Project name can\'t be more than 20 characters long').required('Project name is required')
	
});

const userSchema = yup.object().shape({
	username: yup.string().required('Enter username')
});

const taskSchema = yup.object().shape({
	taskName: yup.string().max(200, 'Task name can\'t be more than 200 characters long').required('Enter task name')
});

const app = new koa();

app.keys = ['yetanothersecret'];


app.use(bodyParser());
app.use(cors({credentials:true}));

const router = Router();

router.post('/login', async (ctx, next) => {
	console.log('login request');
	try {
		if (ctx.session.login === ctx.request.body.login) {
			ctx.body = {status: 'ok', login: ctx.session.login};
			return;
		}
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in as ' + ctx.session.login, login: ctx.session.login};
			return;
		}
		try {
			await loginSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		const result = await db.getUser(login);
		if (result === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong login'};
			return;
		}
		try {
			var comparison = await bcrypt.compare(ctx.request.body.password, result.passwordHash);
		} catch(err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error', msg: 'Internal server error'};
			return;
		}
		if (!comparison) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Wrong password'};
			return;
		}
		ctx.session.login = login;
		ctx.body = {status: 'ok', login: login};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/signup', async (ctx, next) => {
	console.log('signup request');
	try {
		if (ctx.session.login != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are already logged in', login: ctx.session.login};
			return;
		}
		try {
			await signupSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.request.body.login;
		const result = await db.getUser(login);
		if (result != null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'User with such login already exists'};
			return;
		} else {
			try {
				var hash = await bcrypt.hash(ctx.request.body.password, saltRounds);
			} catch(err) {
				ctx.response.status = 500;
				ctx.body = {status: 'error', msg: 'Internal server error'};
				return;
			}
			await db.createUser(login, hash);
		}
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/logout', async (ctx) => {
	console.log('logout request');
	try {
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		ctx.session.login = null;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/projects', async (ctx) => {
	console.log('get request for projects');
	try {
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const login = ctx.session.login;
		const projects = await db.getProjectsOfUser(login);
		ctx.response.status = 200;
		ctx.body = {status: 'ok', projects: projects};
		} catch (err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error'};
			console.log(err);
		return;
	}
});

router.post('/projects', async (ctx) => {
	console.log('post request to create new project');
	try {
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		try {
			await projectSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const login = ctx.session.login;
		const projectName = ctx.request.body.projectName;
		await db.createNewProject(login, projectName);
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/projects/:projectId/users', async (ctx) => {
	console.log('get request for users of a project');
	try {
		const projectId = ctx.params.projectId;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		if (isNaN(projectId)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid project ID'};
			return;
		}
		const login = ctx.session.login;
		const users = await db.getUsersOfTheProject(projectId);
		let projectUsers = [{username: login}];
		let isUserPresentInProject = false;
		for (let i = 0; i < users.length; i++)
			if (users[i].username !== login)
				projectUsers.push({username: users[i].username});
			else
				isUserPresentInProject = true;
			if (!isUserPresentInProject) {
				ctx.response.status = 400;
				ctx.body = {status: 'error', msg: "You don\'t have access to such project"};
			} else {
				ctx.response.status = 200;
				ctx.body = {status: 'ok', users: projectUsers};
				return;
			}
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.post('/projects/:projectId/users', async (ctx) => {
	console.log('post request to add new user to a project');
	try {
		const projectId = ctx.params.projectId;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		try {
			await userSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		if (isNaN(projectId)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid project ID'};
			return;
		}
		const login = ctx.session.login;
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		const username = ctx.request.body.username;
		const user = await db.getUser(username);
		if (user === null) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Such user doesn\'t exist'};
			return;
		}
		const isUserInTheProject = await db.isUserInTheProject(username, projectId);
		if (isUserInTheProject) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'User alredy in the project'};
			return;
		}
		await db.addUserToTheProject(username, projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.delete('/projects/:projectId', async (ctx) => {
	console.log('delete request to delete a project');
	try {
		const projectId = ctx.params.projectId;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const login = ctx.session.login;
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		await db.deleteProject(projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.delete('/projects/:projectId/users/:username', async (ctx) => {
	console.log('delete request to delete user from a project')
	try {
		const projectId = ctx.params.projectId;
		const username = ctx.params.username;
		const login = ctx.session.login;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const users = await db.getUsersOfTheProject(projectId);
		let access = false;
		let isUserInTheProject = false;
		for (let i = 0; i < users.length; i++) {
			if (users[i].username === login)
				access = true;
			if (users[i].username === username)
				isUserInTheProject = true;
		}
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		if (!isUserInTheProject) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Such user is not in the project'};
			return;
		}
		if (users.length === 1)
			await db.deleteProject(projectId);
		else
			await db.deleteUserFromTheProject(username, projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.get('/projects/:projectId/tasks', async (ctx) => {
	console.log('get request for tasks of a project');
	try {
		const projectId = ctx.params.projectId;
		const login = ctx.session.login;
		if ((typeof login === 'undefined') || (login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		const tasks = await db.getTasksOfTheProject(projectId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok', tasks: tasks};
		} catch (err) {
			ctx.response.status = 500;
			ctx.body = {status: 'error'};
			console.log(err);
		return;
	}
});

router.post('/projects/:projectId/tasks', async (ctx) => {
	console.log('get request for tasks of a project');
	try {
		const projectId = ctx.params.projectId;
		const login = ctx.session.login;
		const taskName = ctx.request.body.taskName;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		try {
			await taskSchema.validate(ctx.request.body);
		} catch(err) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'Invalid request: ' + err.message};
			return;
		}
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		const priority = (ctx.request.body.priority) ? ctx.request.body.priority : null;
		const currentDate = (new Date).toISOString();
		await db.addTask(taskName, projectId, currentDate, priority);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

router.delete('/projects/:projectId/tasks/:taskId', async (ctx) => {
	console.log('delete request to delete task from a project')
	try {
		const projectId = ctx.params.projectId;
		const taskId = ctx.params.taskId;
		const login = ctx.session.login;
		if ((typeof ctx.session.login === 'undefined') || (ctx.session.login === null)) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You are not logged in'};
			return;
		}
		const access = await db.isUserInTheProject(login, projectId);
		if (!access) {
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'You don\'t have access to such project'};
			return;
		}
		const isTaskInTheProject = await db.isTaskInTheProject(taskId, projectId);
		if (!isTaskInTheProject){
			ctx.response.status = 400;
			ctx.body = {status: 'error', msg: 'There is no such task in the project'};
			return;
		}
		await db.deleteTask(taskId);
		ctx.response.status = 200;
		ctx.body = {status: 'ok'};
	} catch (err) {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		console.log(err);
		return;
	}
});

app.use(session());
app.use(router.routes(app));

app.listen(3001);