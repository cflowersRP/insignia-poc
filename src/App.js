import { useEffect, useState } from 'react';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';
import Utf8 from 'crypto-js/enc-utf8';

import './App.css';

const ENDPOINTS = {
	configurators: 'https://indie.staging.insigniagroup.com/api/v2/configurators',
	colors: 'https://indie.staging.insigniagroup.com/api/v2/configurators/colors',
	product: 'https://indie.staging.insigniagroup.com/api/v2/configurators/product',
	products: 'https://indie.staging.insigniagroup.com/api/v2/configurators/products',
	vehicles: 'https://indie.staging.insigniagroup.com/api/v2/configurators/vehicles'
};


async function baseGETRequest(url) {
	const timeStamp = Math.round((new Date()).getTime() / 1000);
	const nonce = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'
		.replace(/[xy]/g, function (c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8;
			return v.toString(16)
		});

	const encodedUrl = encodeURIComponent(url).toLowerCase();

	const signature = `${process.env.REACT_APP_INSIGNIA_PUB_KEY}GET${encodedUrl}${timeStamp}${nonce}`;
	const hmacSha256 = hmacSHA256(Utf8.parse(signature), Base64.parse(process.env.REACT_APP_INSIGNIA_PRIV_KEY));
	const authorization = `Insignia ${process.env.REACT_APP_INSIGNIA_PUB_KEY}:${Base64.stringify(hmacSha256)}:${timeStamp}:${nonce}`;

	try {
		const response = await fetch(
			url,
			{
				method: 'GET',
				headers: {
					accept: `application/json`,
					[`content-type`]: `application/json`,
					'Authorization': authorization,
				},
				credentials: 'include',
			}
		);
		const json = await response.json();
		console.log('success', json);
		return json;
	} catch (err) {
		console.error(err);
		throw err;
	}
}


async function fetchVehicles() {
	return baseGETRequest(ENDPOINTS.vehicles);
}

function fetchVehicleConfig({ vehicle, appId }) {
	const parameters = buildURLParams({ vehicle, appId });
	return baseGETRequest(`${ENDPOINTS.configurators}/${parameters}`);
}

function fetchProductsConfig({ vehicle, appId }) {
	const parameters = buildURLParams({ vehicle, appId });
	return baseGETRequest(`${ENDPOINTS.products}/${parameters}`);
}

function fetchColorsConfig({ vehicle, appId }) {
	const parameters = buildURLParams({ vehicle, appId });
	return baseGETRequest(`${ENDPOINTS.colors}/${parameters}`);
}

function buildURLParams({ vehicle, appId }) {
	return appId || `${vehicle.yearId}/${vehicle.makeId}/${vehicle.modelId}/${vehicle.submodelId ? `${vehicle.submodelId}` : ''}`;
}

function App() {
	const [vehicles, setVehicles] = useState([]);
	const [activeVehicle, setActiveVehicle] = useState(null);

	useEffect(() => {
		async function getIt() {
			const data = await fetchVehicles();
			if (data && data.items) {
				setVehicles(data.items);

				// find a good car
				const car = data.items.find((item) => {
					return item.make.toLowerCase() === 'kia'
					&& item.year === 2015
					&& item.model.toLowerCase() === 'forte 5-door'
					&& item.submodel.toLowerCase() === 'sx'
				});

				if (car) {
					console.log('found car', car);
					setActiveVehicle(car);
					const [vehicle, products, colors] = await Promise.all([
						fetchVehicleConfig({ vehicle: car }),
						fetchProductsConfig({ vehicle: car }),
						fetchColorsConfig({ vehicle: car }),
					]);
					console.log('I got all of it again', vehicle, products, colors);
				} else {
					console.error('did not find car');
				}
			}
		}
		getIt();
	}, []);

	return (
		<div className="App">
			<div>Vehicles</div>
			{activeVehicle && (
				<pre>{JSON.stringify(activeVehicle)}</pre>
			)}
			{/*{vehicles.map(item => (*/}
			{/*	<pre>{JSON.stringify(item)}</pre>*/}
			{/*))}*/}
		</div>
	);
}

export default App;
