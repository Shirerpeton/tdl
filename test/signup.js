'use strict';

const chai = require('chai')
	, expect = chai.expect
	, sinon = require('sinon')
	, chaiHttp = require('chai-http')
	, chaiAsPromised = require("chai-as-promised")
	, bcrypt = require('bcryptjs')
	, db = require('../db.js');

chai.use(chaiHttp);
chai.use(chaiAsPromised);

let sandbox = sinon.createSandbox();
var server;

let client = {
	query: sandbox.stub(),
	release: sandbox.spy()
};

describe('/signup', () => {
	afterEach('restore sandbox and restart server', () => {
		sandbox.restore();
		sandbox.reset();
		client.query.resetHistory();
		client.release.resetHistory();
	});
	beforeEach('starting server', () => {
		sandbox.stub(db.pool, 'connect').returns(client);
		server = require('../app.js');
	});
	describe('post', () => {
		beforeEach('stub functions', () => {
			sandbox.stub(db, 'getUser').withArgs('testUsername').returns({username: 'testUsername', passwordHash: 'testHash'});
			sandbox.stub(bcrypt, 'hash').withArgs('testPassword', 8).returns('testHash');
		});
		describe('with proper data', () => {
			it('register new user', done => {
				chai.request(server)
				.post('/signup')
				.send({login: 'anotherUsername', password: 'testPassword'})
				.then(res => {
					expect(res.body.status).to.equal('ok');
					expect(bcrypt.hash.calledWith('testPassword', 8)).to.be.true;
				}).then(done).catch(console.log);
			});
		});
		describe('with invalid request', () => {
			it('send json with proper error', done => {
				chai.request(server)
				.post('/signup')
				.send({login: 'anotherUsername', wrong_password: 'testPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					done();
				});
			});
		});
		describe('with already taken login', () => {
			it('send json with proper error', done => {
				chai.request(server)
				.post('/signup')
				.send({login: 'testUsername', password: 'testPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.be.equal("User with such login already exists");
					expect(bcrypt.hash.called).to.be.false;
					done();
				});
			});
		});
	});
});