'use strict';

const chai = require('chai')
	, expect = chai.expect
	, sinon = require('sinon')
	, chaiAsPromised = require("chai-as-promised")
	, db = require('../db.js');

chai.use(chaiAsPromised);

const recordset = [{username : 'user1'}, {username: 'user2'}, {username: 'user3'}];
const userRecordset = [{username: 'user'}]

let sandbox = sinon.createSandbox();

let client = {
	query: sandbox.stub(),
	release: sandbox.spy()
}

describe('db', function() {
	beforeEach(() => {
		sandbox.stub(db.pool, 'connect').returns(client);
	});
	afterEach(() => {
		sandbox.restore();
		sandbox.reset();
		client.query.resetHistory();
		client.release.resetHistory();
	});
	describe('#getUsersOfTheProject()', function() {
		it('returns userdata of users in certain project', function(done){
			client.query.returns({rows: recordset}); 
			expect(db.getUsersOfTheProject()).to.eventually.be.equal(recordset).then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(console.log);
		});
	});
	describe('#getProjectsOfUser()', function() {
		it('returns array of projects of certain user', function(done) {
			client.query.returns({rows: recordset});
			expect(db.getProjectsOfUser()).to.eventually.be.equal(recordset).then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
	describe('#getUser()', function() {
		it('returns userdata of user with certain username', function(done) {
			client.query.returns({rows: userRecordset});
			expect(db.getUser()).to.eventually.be.equal(userRecordset[0]).then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
	describe('#isUserInTheProject() with data of user that present in the project', function() {
		it('returns true', function(done) {
			client.query.returns({rows: ['testUsername']});
			expect(db.isUserInTheProject('testUsername', 0)).to.eventually.be.true.then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
	describe('#isUserInTheProject() with data of user that not present in the project', function() {
		it('returns true', function(done) {
			client.query.returns({rows: []});
			expect(db.isUserInTheProject('testUsername', 0)).to.eventually.be.false.then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
	describe('#isTaskInTheProject() with data of task that present in the project', function() {
		it('returns true', function(done) {
			client.query.returns({rows: [{taskName: 'testTask'}]});
			expect(db.isTaskInTheProject(0, 0)).to.eventually.be.true.then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
	describe('#isTaskInTheProject() with data of task that not present in the project', function() {
		it('returns false', function(done) {
			client.query.returns({rows: []});
			expect(db.isTaskInTheProject(0, 0)).to.eventually.be.false.then(() => {
				expect(client.release.calledOnce).to.be.true;
			}).then(done).catch(err => {console.log(err);});
		});
	});
});