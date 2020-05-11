import React from 'react';
import logo from './logo.svg';
import './App.css';
import {BrowserRouter as Router, Route, NavLink, Switch, Link} from "react-router-dom";

const axios = require('axios');

function App() {
  return (
	<Router>
		<div className="App">
		<Element />
		</div>
	</Router>
  );
}

class Element extends React.Component {
	constructor(props) {
		super(props);
		this.ajaxReq = this.ajaxReq.bind(this);
	}
	
	componentDidMount() {
		this.ajaxReq();
		console.log('element mounted');
	}
	
	async ajaxReq() {
		console.log('send');
		var response = await axios.get('/');
		console.log(response);
	}
	
	render() {
		return(
			<div>
				Element 
			</div>
		);
	}
}

export default App;
