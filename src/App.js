import React, { Component } from 'react';
import { FormControl, Button, Label, Panel } from 'react-bootstrap';
import logo from './logo.svg';
import './App.css';
import fetchData from './services/fetchData';
import _ from 'lodash';
import moment from 'moment';
import FontAwesome from 'react-fontawesome';
import Client from 'speech-to-text-client';

class App extends Component {

  constructor(props)  {
    super(props); 
    this.state = {
      value: '',
      spinner: false,
      dateBlocks: [],
      errorMessage: null,
      audioSupported: false,
      speechStatus: ""
    };
  }

  componentDidMount() {
    const canvas = document.getElementById("visualizer");
    this.speechClient = new Client("ws://localhost:8123", canvas);

    const self = this;
    this.speechClient.on("supported", function(audioSupported) {
      console.log("Is Supported", audioSupported);
      self.setState({audioSupported: audioSupported});
    });

    this.speechClient.on("state", function(status) {
      console.log("STATE CHANGE", status);
      self.setState({speechStatus: status})
    });

    this.speechClient.on("result", function(result) {
      console.log("RESULT", result);
      self.setState({value: result});
      self.getDateBlock();
    })
  }

  handleChange = (e) => {
    this.setState({ value: e.target.value });
  };

  getDateBlock = () => {
    this.setState({ spinner: true, errorMessage: null });
    return fetchData("/api/dates", "POST", { phrase: this.state.value })
      .then(results => {
        if (!results.success) {
          this.setState({ errorMessage: results.msg, spinner: false });
        } else if (results.result && results.result.length > 0) {
          let blocks = this.state.dateBlocks;
          blocks = _.concat(blocks, { phrase: this.state.value, dates: results.result });
          blocks = _.reverse(blocks);
          this.setState({ dateBlocks: blocks, spinner: false });
        }
        this.setState({ spinner: false });
      });
  };

  buildDates = (dates, idx) => {
    return dates.map(date => {
      let start = moment(date.startDate).format("ddd MM-DD-YYYY h:mma");
      let end = moment(date.endDate).format("h:mma");
      return (
        <h3 key={idx}><Label>{start} - {end}</Label></h3>
      )
    });
  };

  handleMicrophoneClick = (e) => { 
    e.preventDefault();
    this.speechClient.startListening();
  };

  render() {
    const height = this.state.speechStatus === "Listening" ? "50px" : "0px";
    const speechStyle = { height: height };
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>
        <div className="date-label">Enter the dates and times you're available</div>
        <FormControl
          className="date-input"
          type="text"
          value={this.state.value}
          placeholder="Enter your availability..."
          onChange={this.handleChange}
        />
        <span onClick={(event) => this.handleMicrophoneClick(event)}>
          <FontAwesome 
            name="microphone"
            size="2x"
            className="availability-mic" 
          />
        </span>
        <Button bsStyle="primary" onClick={this.getDateBlock}>Add Availability Block</Button>

        <div className="visualizer-container">
          <canvas id="visualizer" className="visualizer" style={speechStyle}></canvas>
        </div>

        <div className="examples">
          <b>Examples</b>
          <ul>
            <li><i>This Wednesday from 1 to 5pm</i></li>
            <li><i>Wednesday through next Wednesday between 2 to 4pm</i></li>
            <li><i>Tuesday or Wednesday from 9am to 11am</i></li>
          </ul>
        </div>

        { this.state.errorMessage !== null &&
          <div className="error">{this.state.errorMessage}</div>
        }

        <br />
        <br />
        <h4>Available on the following Date blocks:</h4>
        { this.state.dateBlocks.map((block, idx) => {
            return (
              <div key={idx}>
                <Panel className="result">
                  <div>Phrase: {block.phrase}</div>
                  { this.buildDates(block.dates, idx) }
                </Panel>
              </div>
            )
          })
        }
      </div>
    );
  }
}

export default App;
