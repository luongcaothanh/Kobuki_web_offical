import React, { Component } from "react";
import { Container, Card, Col, Row } from "react-bootstrap";
import ROSLIB from "roslib";
import "../CommonStyle.css";
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

class Status extends Component {
  constructor(props) {
    super(props);
    this.state = {
      speed: 0,
    };
    this.ros = props.ros || null;
    this.subVelocity = null;
  }
  componentDidUpdate() {
    var that = this;
    if (this.ros !== this.props.ros) {
      this.ros = this.props.ros;
      if (this.ros !== null) {
        this.subVelocity = new ROSLIB.Topic({
          ros: this.ros,
          name: '/mobile_base/commands/velocity',
          messageType: 'geometry_msgs/Twist'
        });
        this.subVelocity.subscribe(function(message) {
          // console.log("velocity message", message);
          that.setState({speed: Math.abs(Math.round(message.linear.x * 100) / 100)});
        });
      }
    }
  }
  render() {
    return (
      <Container className="box-margin">
        <Card border="secondary">
          <Card.Header style={{fontSize: "1.2rem" }}><strong>Status</strong></Card.Header>
          <Card.Body>
            <Row>
              <Col>
                <Container style={{width: "200px"}}>
                  <CircularProgressbarWithChildren
                    value={this.state.speed}
                    maxValue={1}
                    circleRatio={0.75}
                    styles={buildStyles({
                      rotation: 1 / 2 + 1 / 8,
                      trailColor: "#eee"
                    })}
                  >
                    <div style={{ fontSize: "2rem", marginTop: "2rem", marginBottom: "0rem", paddingBottom: "0rem"}}>
                      <strong>{this.state.speed}</strong>m/s
                    </div>
                    <div style={{ fontSize: "1.6rem", marginTop: "2rem" }}>
                      speed
                    </div>
                  </CircularProgressbarWithChildren>
                </Container>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    )
  }
}

export default Status;