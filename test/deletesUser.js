'use strict';

const chai = require('chai')
	, expect = chai.expect
	, sinon = require('sinon')
	, chaiHttp = require('chai-http')
	, chaiAsPromised = require("chai-as-promised")
	, bcrypt = require('bcryptjs')
	, db = require('../db.js');

chai.use(chaiHttp);

let sandbox = sinon.createSandbox();
let server;

let client = {
	query: sandbox.stub(),
	release: sandbox.spy()
};

describe('delete user', () => {
	describe('while logged', () => {
		let agent;
		beforeEach('logging', done => {
			server = require('../app.js');
			sandbox.stub(db.pool, 'connect').returns(client);
			sandbox.stub(db, 'getUser').withArgs('testUsername').returns({username: 'testUsername', passwordHash: 'testHash'});
			sandbox.stub(db, 'isUserInTheProject');
			sandbox.stub(db, 'isTaskInTheProject');
			sandbox.stub(db, 'getUsersOfTheProject');
			sandbox.spy(db, 'deleteProject');
			sandbox.stub(bcrypt, 'compare').withArgs('testPassword', 'testHash').returns(true);
			agent = chai.request.agent(server);
			agent
			.post('/login')
			.send({login: 'testUsername', password: 'testPassword'})
			.then(res => {
				expect(res.body.status).to.equal('ok');
				db.getUser.resetHistory();
				bcrypt.compare.resetHistory();
				done();
			});
		});
		afterEach('reset spies and stubs', done => {
			sandbox.restore();
			sandbox.reset();
			client.query.resetHistory();
			client.release.resetHistory();
			server.close();
			done();
		});
		describe('delete to "/projects/badId/users/testUsername"', () => {
			it('sends json with proper error', done => {
				agent
				.delete('/projects/badId/users/testUsername')
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.equal('Invalid project ID');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername" without access to the project', () => {
			it('sends json with proper error', done => {
				db.getUsersOfTheProject.withArgs('0').returns([{username: 'otherUsername'}]);
				agent
				.delete('/projects/0/users/testUsername')
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.equal('You don\'t have access to such project');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername" when username not in the project', () => {
			it('sends json with proper error', done => {
				db.getUsersOfTheProject.withArgs('0').returns([{username: 'testUsername'}]);
				agent
				.delete('/projects/0/users/testUsername1')
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					expect(res.body.msg).to.equal('Such user is not in the project');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername" with error in the database', () => {
			it('sends json with proper error', done => {
				db.getUsersOfTheProject.withArgs('testUsername', '0').throws('Database error!');
				agent
				.delete('/projects/0/users/testUsername1')
				.end((err, res) => {
					expect(res.body.status).to.equal('error');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername1" with username of other user and when there are other users in the project', () => {
			it('deletes user and sends json without errors', done => {
				db.getUsersOfTheProject.withArgs('0').returns([{username: 'testUsername'}, {username: 'testUsername1'}]);
				client.query.returns({rows: [{username: 'testUsername'}, {username: 'test'}]});
				agent
				.delete('/projects/0/users/testUsername1')
				.end((err, res) => {
					expect(res.body.status).to.equal('ok');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername1" with username of yourself and when there are other users in the project', () => {
			it('deletes user and sends json without errors', done => {
				db.getUsersOfTheProject.withArgs('0').returns([{username: 'testUsername'}, {username: 'testUsername1'}]);
				agent
				.delete('/projects/0/users/testUsername')
				.end((err, res) => {
					expect(res.body.status).to.equal('ok');
					done();
				});
			});
		});
		describe('delete to "/projects/0/users/testUsername1" with username of yourself and when there are no other users in the project', () => {
			it('deletes user and sends json without errors', done => {
				db.getUsersOfTheProject.withArgs('0').returns([{username: 'testUsername'}]);
				client.query.returns({rows: [{username: 'testUsername'}]});
				agent
				.delete('/projects/0/users/testUsername')
				.end((err, res) => {
					expect(db.deleteProject.calledOnce).to.be.true;
					expect(res.body.status).to.equal('ok');
					done();
				});
			});
		});
	});
});