const EventEmitter = require('events').EventEmitter;

class APIFetcher extends EventEmitter {
	constructor(apis) {
		super();
		this.apis = apis;
	}
	
	start() {
		if (!this.started)
			this.started = true;
		else
			throw new Error('API Fetching has already started');
		
		this.emit('log', 'debug', `Started API fetching`);
		this.apis.forEach((api) => {
			if (api.startDelay)
				setTimeout(() => {this.callAPI(api)}, api.startDelay);
			else
				this.callAPI(api);
		});
	}
	
	callAPI(api) {
		this.emit('log', 'debug', `Calling API: ${api.name}`);
		if (api.call.type == 'promise') {
			api.call.func()
			.then((res) => {
				this._handleSuccessfulResponseForAPI(api, res);
			})
			.catch((err) => {
				this._handleErrorForAPI(api, err);
			});
		} else if (api.call.type == 'callback') {
			api.call.func((err, res) => {
				if (err)
					this._handleErrorForAPI(api, err);
				else if (res)
					this._handleSuccessfulResponseForAPI(api, res);
			});
		}
	}
	
	_handleSuccessfulResponseForAPI(api, res) {
		if (api.errorObjects && api.errorObjects.length > 0) {
			for (let obj in api.errorObjects) {
				const prop = api.errorObjects[obj];
				if (res.hasOwnProperty(prop)) {
					return this._handleErrorForAPI(api, new Error(`Error property: ${prop} was found in response`));
				}
			}
		}
		
		if (api.customCalls)
			res = api.customCalls(res);

		this.emit('log', 'success', `Received successful response from API: ${api.name}`);
		this.emit(api.name, null, res);
		if (api.refreshTime)
			setTimeout(() => {this.callAPI(api)}, api.refreshTime);
	}
	
	_handleErrorForAPI(api, error) {
		this.emit('log', 'error', `Error fetching data for API: ${api.name} ${error}. Retrying in ${api.retryTime} ms.`);
		this.emit(api.name, error, null);
		if (api.retryTime)
			setTimeout(() => {this.callAPI(api)}, api.retryTime);
	}

	getAPIFromName(name) {
		for (let api in this.apis) {
			if (this.apis[api].name == name)
				return this.apis[api];
		}
	}

	minutesToMS(minutes) {
		return Math.round(minutes * 60000);
	}

	hoursToMS(hours) {
		return Math.round(hours * 3600000);
	}
}

module.exports = APIFetcher;