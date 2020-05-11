'use strict';

const moment = require('moment');

const bcrypt = require('bcryptjs');
const saltRounds = 8;

const yup = require('yup');


const koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');

const app = new koa();

app.keys = ['yetanothersecret'];

app.use(session(app));

app.use(bodyParser());

const router = Router();

console.log('attempt1');

router.get('/', async (ctx) => {
	console.log("get request on '/'");
	try {
		ctx.response.status = 500;
		ctx.body = {status: 'error'};
		return;
	} catch (err) {
		return;
	}
});

app.use(router.routes());

app.listen(3001);