import React, { Component } from "react";
import { Container, Form, Card } from "react-bootstrap";
import "../CommonStyle.css"

var DEFAULT_LINEAR_VEL = 0.2;
var DEFAULT_ANGULAR_VEL = 0.45;

class Parameters extends Component {
  constructor(props) {
    super(props);
    this.onChangeLinearVel = props.onChangeLinearVel;
    this.onChangeAngularVel = props.onChangeAngularVel;
    this.state = {
      param: [
        {
          name: "Linear Velocity",
          value: DEFAULT_LINEAR_VEL,
          unit: "m/s",
        },
        {
          name: "Angular Velocity",
          value: DEFAULT_ANGULAR_VEL,
          unit: "rad/s",
        },
      ]
    }
    this.onChange = this.onChange.bind(this);
  }
  onChange(event, index) {
    let value = event.target.value / 20;
    this.setState((state) => {
      state.param[index].value = value;
      return state;
    });
    if (index === 0) {
      this.onChangeLinearVel(value);
    } else if (index === 1) {
      this.onChangeAngularVel(value);
    }
  }

  _rend_param_item(item, index) {
    return (
      <Form key={index}>
        <Form.Group controlId="formBasicRangeCustom">
          <Form.Label>{item.name + ": " + item.value + " " + item.unit}</Form.Label>
          <Form.Control type="range" min={1} max={20} value={item.value * 20} custom onChange={(event) => this.onChange(event, index)}/>
        </Form.Group>
      </Form>
    )
  }

  componentDidMount() {
    this.onChangeLinearVel(DEFAULT_LINEAR_VEL);
    this.onChangeAngularVel(DEFAULT_ANGULAR_VEL);
  }

  render() {
    let param_list = [];
    this.state.param.forEach((item, index) => {
      param_list.push(this._rend_param_item(item, index));
    })
    return (
      <Container className="box-margin">
        <Card border="secondary">
          <Card.Header style={{fontSize: "1.2rem" }}><strong>Parameters</strong></Card.Header>
          <Card.Body>
            {param_list}
          </Card.Body>
        </Card>
      </Container>
    );
  }
}

export default Parameters;