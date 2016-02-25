import React from 'react';
import ReactDOM from 'react-dom';
import { Router, hashHistory  } from 'react-router';
import routes from './routes';

// main styles
import bootstrap from 'bootstrap/dist/css/bootstrap.min.css';
import mainStyles from './styles/main.scss';

// add fastclick to app
import fastClick from 'fastclick';
fastClick.attach(document.body);

// add i18next
import i18next from 'i18next';

document.addEventListener('DOMContentLoaded', onLoad, false);

function onLoad() {
    console.log('onLoad', window.cordova, typeof cordova);
    if (window.cordova) {
        console.log('cordova');
        //on device stuff
        document.addEventListener('deviceready', onDeviceReady, false);
    } else {
        //this is the development mode for the browser
        init();
    }
}


function onDeviceReady() {
    console.log('onDeviceReady');
    document.addEventListener('backbutton', backKeyDown, true);
	navigator.app.overrideBackbutton(true);
	if (window.screen && screen.lockOrientation) {
		screen.lockOrientation('portrait-primary');
	}
    init();
}

function backKeyDown() {}

function init() {
    console.log('init');
    i18next.init({
        lng: 'de',
        fallbackLng: 'en',
        interpolationPrefix: '__',
        interpolationSuffix: '__',
        resources: {
            en: require('./locales/en.json'),
            de: require('./locales/de.json')
        }
    }, (err, t) => {
        console.log('init success');
        ReactDOM.render(
           <Router routes={routes} history={hashHistory}/>,
            document.getElementById('root')
        );
    });
}

