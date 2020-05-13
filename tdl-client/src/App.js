import React from 'react';
import './App.css';
import {Formik, Form, Field, ErrorMessage} from 'formik';
import * as yup from 'yup';
import * as cookies from 'js-cookie'
import {BrowserRouter as Router, Route, NavLink, Switch, Link} from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleUp, faAngleDown, faPen } from "@fortawesome/free-solid-svg-icons";
import onClickOutside from "react-onclickoutside";

const localhost = 'http://localhost:3001';

const axios = require('axios');
const moment = require('moment');

axios.defaults.withCredentials = true;
axios.defaults.crossDomain = true;

const signupSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password').min(4, 'Passowrd must be at least 4 characters long').max(50, 'Password must not be more than 50 characters long'),
	repeatPassword: yup.string().oneOf([yup.ref('password'), null], "Passwords must match").required('Repeat password'),
});

const loginSchema = yup.object().shape({
	login: yup.string().required('Enter login'),
	password: yup.string().required('Enter password')
});

const projectSchema = yup.object().shape({
	projectName: yup.string().max(20, 'Project name can\'t be more than 20 characters long').required('Project name is required')
	
});

const arrowFunc = () => {};

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = {loggedIn: cookies.get('login') && true};
		this.logInHandle = this.logInHandle.bind(this);
		this.logOutHandle = this.logOutHandle.bind(this);
	}
	
	logInHandle(login) {
		cookies.set('login', login, { expires: 1 });
		this.setState({loggedIn: true});
	}
	
	async logOutHandle() {
		this.setState({loggedIn: false});
		try {
			var response = await axios.get(localhost + '/logout');
		} catch(err) {
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('You are not logged in'):
					cookies.remove('login');
					break;
				default:
					break;
			}
			return;
		}
		if (response.data.status === 'ok') {
			cookies.remove('login');
			return;
		}
	}
	
	render() {
		return (
			<Router>
				<div className="App">
					<NavBar 
						left={[
							<NavLink exact to="/" className="nav-link" activeClassName="activeBtn">
								Home
							</NavLink>,
							<NavLink to="/about" className="nav-link" activeClassName="activeBtn">
								About
							</NavLink>]}
						right={!(this.state.loggedIn) ?
								[<SignUpBtn />, <LogInBtn />]
							:
								[<DropDownBtn title={cookies.get('login')} className='profile-btn' list={[<LogOutBtn logOutHandle={this.logOutHandle} />]} />]
							}
					/>
						<Switch>
							<Route path='/login' render={(props) => <LogInForm {...props} logInHandle={this.logInHandle} />} />
							<Route path='/signup' render={(props) => <SignUpForm {...props} logInHandle={this.logInHandle} />}/>
							<Route path='/about' component={AboutPage} />
							<Route exact path='/' component={Lists} />
						</Switch>
				</div>
			</Router>
		);
	}
}

class Lists extends React.Component {
	constructor(props) {
		super(props);
		this.state = {projects: [], selectedProject: null, taks: [], users: [], addingProject: false};
		this.updateProjects = this.updateProjects.bind(this);
		this.addProjectHandle = this.addProjectHandle.bind(this);
	}
	
	async updateProjects() {
		try {
			var response = await axios.get(localhost + '/projects');
			this.setState({projects: response.data.projects});
		} catch(err) {
			console.log(err);
			if (typeof err.response !== 'undefined')
				console.log(err.response.data.msg);
		}
	}
	
	async updateTasks() {
		try {
			var response = await axios.get(localhost + '/projects/' + this.state.selectedProject.projectId + '/tasks');
		} catch(err) {
			console.log(err);
			if (typeof err.response !== 'undefined')
				console.log(err.response.data.msg);
		}
	}
	
	async updateUsers() {
		try {
			var response = await axios.get(localhost + '/projects/' + this.state.selectedProject.projectId + '/users');
		} catch(err) {
			console.log(err);
			if (typeof err.response !== 'undefined')
				console.log(err.response.data.msg);
		}
	}
	
	componentDidMount() {
		this.updateProjects();
	}
	
	addProjectHandle() {
		this.setState(state => ({addingProject: !state.addingProject}));
	}
	
	selectProject(project) {
		return () => {
			this.setState(state => ({selectedProject: project}));
			this.updateTasks();
			this.updateUsers();
		};
	}
	
	render() {
		return (
			<div className='main'>
				<div className='projects'>
					<button type='button' className='btn' onClick={this.addProjectHandle}>
						Add Project
					</button>
					{this.state.addingProject ? <AddProjectForm updateProjects={this.updateProjects} /> : null}
					{this.state.projects.map((project, index) => 
						<Project name={project.projectName} key={project.projectId} handleClick={this.selectProject(project)} />
					)}
				</div>
				<div className='tasks'>
					Tasks
				</div>
				<div className='users'>
					Users
				</div>
			</div>
		);
	}
}

class Project extends React.Component {
	constructor(props) {
		super(props);
	}
	
	render() {
		return (
			<div className='max-width'>
				<button type='button' className='project-name' onClick={this.props.handleClick}>
					{this.props.name}
				</button>
				<button type="submit" className='inline-btn'>
					x
				</button>
			</div>
		);
	}
}

class AddProjectForm extends React.Component {
	constructor(props) {
		super(props);
		this.submitHandle = this.submitHandle.bind(this);
	}
	
	async submitHandle(values, {setErrors}) {
		try {
			var response = await axios.post(localhost +'/projects', {
				projectName: values.projectName
			})
		} catch(err) {
			console.log(response);
			console.log(err.response.data.msg);
			if (err.response.data.msg) {
				setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
			}
			return;
		}
		if (response.data.status === 'ok') {
			this.props.updateProjects();
			return;
		}
	}	
	
	render() {
		return(
			<div>
				<Formik
					initialValues={{projectName: ''}}
					onSubmit={this.submitHandle}
					validationSchema={projectSchema}
				>
					{({errors, touched}) => (
						<Form className='AddProjectForm'>
							<Field className='inline-input-field' name='projectName'/>
							<button type="submit" className='inline-btn'>
								+
							</button>
							<ErrorMessage name="projectName" component='div' className='error-msg'/>
							<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
						</Form>
					)}
				</Formik>
			</div>
		);
	}
}

function AboutPage(props) {
	return(
		<div className='page'>
			To do list web app wth focus on group work
			<br/>
			Author: ----
			<br/>
			Email: ----
		</div>
	);
}

function CustomErrorMessage(props) {
		 const result = (props.errors && props.errors[props.name]) ?
			<div className={props.className}>
				{props.errors[props.name]}
			</div>
			: null;
		return(result);
}

class SignUpForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {login: '', password: '', repeatPassword: ''};
		
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	
	handleInputChange(event) {
		this.setState({[event.target.name]: event.target.value});
	}
	
	async handleSubmit(values, {setErrors}) {
		try {
			var response = await axios.post(localhost +'/signup', {
				login: values.login,
				password: values.password
			})
		} catch(err) {
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('User with such login already exists'):
					setErrors({'login': 'User with such login already exists'});
					break;
				case('You are already logged in'):
					setErrors({'submit': 'You are already logged in'});
					this.props.logInHandle(err.response.data.login);
					break;
				default:
					setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
					break;
			}
			return;
		}
		if (response.data.status === 'ok') {
			this.props.history.push('/login');
			return;
		}
	}
	
	render() {
		return (
			<Formik
				initialValues={{login: '', password: '', repeatPassword: ''}}
				onSubmit={this.handleSubmit}
				validationSchema={signupSchema}
			>
				{({errors, touched}) => (
					<Form className='form'>
						<label htmlFor='login' className='input-label'>Login</label>
						<Field className='input-field' name='login'/>
						<ErrorMessage name="login" component='div' className='error-msg'/>
						<label htmlFor='password' className='input-label'>Password</label>
						<Field name='password' className='input-field' type='password'/>
						<ErrorMessage name="password" component='div' className='error-msg'/>
						<label htmlFor='repeatPassword' className='input-label'>Repeat password</label>
						<Field name='repeatPassword' className='input-field' type='password'/>
						<ErrorMessage name="repeatPassword" component='div' className='error-msg'/>
						<button type="submit" className='submit-btn'>
							Submit
						</button>
						<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
					</Form>
				)}
			</Formik>
		);
	}
}

class LogInForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {login: '', password: ''};
		
		this.handleInputChange = this.handleInputChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}
	
	handleInputChange(event) {
		this.setState({[event.target.name]: event.target.value});
	}
	
	async handleSubmit(values, {setErrors}) {
		try {
			var response = await axios.post(localhost + '/login', {
				login: values.login,
				password: values.password
			})
		} catch(err) {
			console.log(err);
			console.log(err.response.data.msg);
			switch(err.response.data.msg) {
				case('Wrong login'):
					setErrors({'login': 'Wrong login'});
					break;
				case('Wrong password'):
					setErrors({'password': 'Wrong password'});
					break;
				default:
					setErrors({'submit': 'Error occured while submitting: ' + err.response.data.msg});
					break;
			}
			if (err.response.data.msg.startsWith('You are already logged in as ')) {
				this.props.logInHandle(err.response.data.login);
			}
			return;
		}
		if (response.data.status === 'ok') {
			this.props.logInHandle(response.data.login);
		}
		this.props.history.push('/');
	}
	
	render() {
		return (
			<Formik
				initialValues={{login: '', password: ''}}
				onSubmit={this.handleSubmit}
				validationSchema={loginSchema}
			>
				{({errors, touched}) => (
					<Form className='form'>
						<label htmlFor='login' className='input-label'>Login</label>
						<Field className='input-field' name='login'/>
						<ErrorMessage name="login" component='div' className='error-msg'/>
						<label htmlFor='password' className='input-label'>Password</label>
						<Field name='password' className='input-field' type='password'/>
						<ErrorMessage name="password" component='div' className='error-msg'/>
						<button name='submit' type="submit" className='submit-btn'>
							Submit
						</button>
						<CustomErrorMessage name="submit" className='error-msg' errors={errors} />
					</Form>
				)}
			</Formik>
		);
	}
}

class NavBar extends React.Component {
	render() {
		return (
			<ul className='navbar'>
				{this.props.left.map((elem, index) =>
					<li key={index}>
						{elem}
					</li>
				)}
				{this.props.right.map((elem, index) =>
					<li key={index} className='rightFloat'>
						{elem}
					</li>
				)}
			</ul>
		);
	}
}

class LogInBtn extends React.Component {
	render() {
		return(
			<NavLink to="/login" className="nav-link" activeClassName="activeBtn">
				Log in
			</NavLink>
		);
	}
}

class SignUpBtn extends React.Component {
	render() {
		return(
			<NavLink to="/signup" className="nav-link" activeClassName="activeBtn">
				Sign up
			</NavLink>
		);
	}
}

class LogOutBtn extends React.Component {
	render() {
		return(
			<button className="log-out-btn" onClick={this.props.logOutHandle}>Log out</button>
		);
	}
}

class DropDown extends React.Component {
	constructor(props) {
		super(props);
		this.state = {listOpen: false};
		this.toggleList = this.toggleList.bind(this);
	}
	
	handleClickOutside(){
		this.setState({
			listOpen: false
		});
	}
	
	toggleList() {
		this.setState(prevState => ({listOpen: !prevState.listOpen}));
	}
	
	render() {
		return(
			<div className={this.props.className}>
				<div className='dd-header' onClick={this.toggleList}>
					{this.props.title + ''}
					<div className='dd-arrow'>
						{this.state.listOpen ?
							<FontAwesomeIcon icon={faAngleUp}/>
						:
							<FontAwesomeIcon icon={faAngleDown}/>
						}
					</div>
					</div>
				{this.state.listOpen && 
					<ul className='dd-list'>
						{this.props.list.map((elem, index) =>
							<li key={index} className='dd-list-item'>
								{elem}
							</li>
						)}
					</ul>
				}
			</div>
		);
	}
}

const DropDownBtn = onClickOutside(DropDown);

export default App;
