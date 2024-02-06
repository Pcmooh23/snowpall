import React from 'react';
import './styles/styles.scss';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Homepage from './components/Homepage';
import SubmitRequest from './components/SubmitRequest';
import { SnowPallProvider } from './components/SnowPallContext';
import LoginPage from './components/LoginPage';



function App() {
  return (
    <Router>
      <SnowPallProvider>
        <div className='App'>
          <Routes>
            <Route exact path='/' element={<LoginPage/>}/>
            <Route exact path='/home' element={<Homepage />}/>
            <Route exact path='/submit-request' element={<SubmitRequest/>}/>
          </Routes>
        </div>
      </SnowPallProvider>
    </Router>
  );
}

export default App;
