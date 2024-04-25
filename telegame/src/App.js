import logo from './logo.svg';
import './App.css';
import Timer from "./Components/Timer";
import React, { useState, useEffect } from 'react'; 
import axios from 'axios'; 

// import { Routes, Route, useParams } from 'react-router-dom';
// function ProfilePage() {
//   let { userId } = useParams();
// }


function App() {
  const [jsDt, setData] = useState('');
  useEffect(() => {axios.get('https://lotto.c4ei.net/api/week').then(res => setData(res))}, []);
  // let userId = useParams();
  return (
    <div className="App">
    {/* <Routes>
      <Route path="users" />
      <Route path=":userId" element={<ProfilePage />} />
    </Routes> */}
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Timer/>
        { jsDt?(<h1 style={{textAlign: "center"}} > {jsDt.data[0].yyyywkr} </h1>)
        : ( <h1 style={{textAlign: "center"}} > no date </h1> )
        }
        {/* <div> id : {userId}</div> */}
      </header>
    </div>
  );
}

export default App;
