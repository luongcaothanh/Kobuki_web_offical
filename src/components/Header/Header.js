import React, { Component } from "react";
import "./Header.css";
import "../CommonStyle.css"
import { Container, Alert, Button } from "react-bootstrap";

class Header extends Component {
  constructor(props) {
    super(props);
    this.ros = props.ros || null;
    this.state = {
      value: '',
      isConnected: false,
    };
    this.connectCb = props.connectCb;
    this.disconnectCb = props.disconnectCb;
    this.url = "ws://localhost:9090";
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.state.value = event.target.value;
  }

  handleSubmit(event) {
    if (!this.state.isConnected) {
      if (this.state.value === '') {
        this.connectCb(this.url);
      } else {
        this.connectCb(this.state.value);
      }
    } else {
      this.disconnectCb();
    }
    event.preventDefault();
  }

  componentWillReceiveProps(props) {
    this.setState({ isConnected: props.isConnected })
    this.ros = this.props.ros;
  }

  render() {
    return (
      <Container className="header-common w-100">
        <Alert variant={this.state.isConnected ? "success" : "danger"} style={{margin: "0"}}>
          {this.state.isConnected ? "Server is online !" : "Server is not available"}
        </Alert>
      </Container>
    )
  }
}

export default Header;