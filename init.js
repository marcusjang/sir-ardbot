import puppeteer from 'puppeteer';

export default function () {
	puppeteer.launch()
		.then(browser => console.log(browser));
	console.log('lel');
}