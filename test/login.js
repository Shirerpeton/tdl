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

describe('/login', () => {
	afterEach('restore sandbox and restart server', () => {
		sandbox.restore();
		server.close();
	});
	beforeEach('starting server', () => {
		server = require('../app.js');
	});
	describe('post', () => {
		beforeEach('stub functions', () => {
			sandbox.stub(db, 'getUser').withArgs('testUsername').returns({username: 'testUsername', passwordHash: 'testHash'});
			sandbox.stub(bcrypt, 'compare').withArgs('testPassword', 'testHash').returns(true);
		});
		describe('with invalid request', () => {
			it('sends json with proper error', done => {
				chai.request(server)
				.post('/login')
				.send({login: 'testUsername', wrong_password: 'testPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					done();
				});
			});
		});
		describe('with proper data', () => {
			it('loggs user into system', done => {
				chai.request(server)
				.post('/login')
				.send({login: 'testUsername', password: 'testPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('ok');
					done();
				});
			});
		});
		describe('with wrong login', () => {
			it('send json with proper error', done => {
				db.getUser.withArgs('wrongUsername').returns(null);
				chai.request(server)
				.post('/login')
				.send({login: 'wrongUsername', password: 'testPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.equal('Wrong login');
					done();
				});
			});
		});
		describe('with wrong password', () => {
			it('send json with proper error', done => {
				chai.request(server)
				.post('/login')
				.send({login: 'testUsername', password: 'wrongPassword'})
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.equal('Wrong password');
					done();
				});
			});
		});
	});
});