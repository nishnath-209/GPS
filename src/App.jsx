import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React from "react";
import GraphQueryInterface from "./components/dashboard";

function App() {
  return (
    <div className="App">
      <h1>Graph Query Processor</h1>
      <GraphQueryInterface />
    </div>
  );
}

export default App
