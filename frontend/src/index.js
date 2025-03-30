import React from 'react';
import ReactDOM from 'react-dom';
import './styles/App.css';
import MainRouter from './components/MainRouter';

ReactDOM.render(
    <React.StrictMode>
        <MainRouter />
    </React.StrictMode>,
    document.getElementById('root')
);