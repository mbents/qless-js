// @staticmethod
// def _import(klass):
//     # 1) Get a reference to the module
//     # 2) Check the file that module's imported from
//     # 3) If that file's been updated, force a reload of that module, return it
//     mod = __import__(klass.rpartition('.')[0])
//     for m in klass.split('.')[1:-1]:
//         mod = getattr(mod, m)
//         
//     # Alright, now check the file associated with it
//     mtime = os.stat(mod.__file__).st_mtime
//     Job._loaded[klass] = min(Job._loaded.get(klass, 1e20), time.time())
//     if Job._loaded[klass] < mtime:
//         mod = reload(mod)
//         
//     return getattr(mod, klass.rpartition('.')[2])

function job(client, atts) {
	this.client = client;
	for (var key in atts) {
		this[key] = atts[key];
	}
	/* Because of how Lua parses JSON, empty tags comes through as {} */
	this.tags         = this.tags.length ? this.tags : [];
	this.dependents   = this.dependents.length ? this.dependents : [];
	this.dependencies = this.dependencies.length ? this.dependencies : [];
}

job.prototype.module = function() {
    // def module(self):
    //     # Return a reference to the class associated with this job. This is meant
    //     # as a convenience in case users ever want to instantiate the class.
    //     return Job._import(self.klass)
}

job.prototype.process = function() {
    // def process(self):
    //     mod = self.module()
    //     # Based on the queue that this was in, we should call the appropriate
    //     # method. So if it was in the 'testing' queue, we should call 'testing'
    //     # If it doesn't have the appropriate function, we'll call process on it
    //     method = getattr(mod, self.queue, getattr(mod, 'process', None))
    //     if method:
    //         if isinstance(method, types.FunctionType):
    //             try:
    //                 method(self)
    //             except:
    //                 self.fail(self.queue + '-failure', traceback.format_exc())
    //         else:
    //             # Or fail with a message to that effect
    //             self.fail(self.queue + '-method-type', repr(method) + ' is not static')
    //     else:
    //         # Or fail with a message to that effect
    //         self.fail(self.queue + '-method-missing', self.klass + ' is missing a method "' + self.queue + '" or "process"')
}

job.prototype.toString = function() {
	return 'qless.job ' + this.jid;
}

job.prototype.ttl = function() {
	return (new Date().getTime() / 1000) - this.expires;
}

job.prototype.move = function(queue, cb, eb) {
	return this.client._put.call([queue], [
		this.jid, this.klass, JSON.stringify(this.data), (new Date().getTime() / 1000), 0
	], cb, eb);
}

job.prototype.complete = function(next, delay, depends, cb, eb) {
	if (typeof(next) == 'function') {
		eb = delay; cb = next; next = null;
	} else if (typeof(delay) == 'function') {
		eb = depends; cb = delay; delay = 0; depends = [];
	} else if (typeof(depends) == 'function') {
		eb = cb; cb = depends; depends = [];
	}
	if (next != null) {
		this.client._complete.call([], [this.jid, this.client.worker, this.queue, (new Date().getTime() / 1000),
		JSON.stringify(this.data), 'next', next, 'delay', delay, 'depends', JSON.stringify(depends)], cb, eb);
	} else {
		this.client._complete.call([], [this.jid, this.client.worker, this.queue, (new Date().getTime() / 1000),
		JSON.stringify(this.data)], cb, eb);
	}
}

job.prototype.complete = function(cb, eb) {
	this.client._heartbeat.call([], [
		this.jid, this.client.worker, (new Date().getTime() / 1000), JSON.stringify(this.data)
	], cb, eb);
}

job.prototype.fail = function(group, message, cb, eb) {
	this.client._fail.call([], [
		this.jid, this.client.worker, group, message, (new Date().getTime() / 1000), JSON.stringify(this.data)
	], cb, eb);
}

job.prototype.cancel = function(cb, eb) {
	this.client._cancel.call([], [this.jid], cb, eb);
}

job.prototype.track = function(tags, cb, eb) {
	if (typeof(tags) == 'function') {
		eb = cb; cb = tags;
		this.client._track.call([], ['track', this.jid, (new Date().getTime() / 1000)], cb, eb);
	} else {
		this.client._track.call([], ['track', this.jid, (new Date().getTime() / 1000)].concat(tags), cb, eb);
	}
}

job.prototype.untrack = function(cb, eb) {
	this.client._track.call([], ['untrack', this.jid, (new Date().getTime() / 1000)], cb, eb);
}

job.prototype.depend = function(jobs, cb, eb) {
	this.client._depends.call([], [this.jid, 'on'].concat(jobs), cb, eb);
}

job.prototype.undepend = function(jobs, cb, eb) {
	this.client._depends.call([], [this.jid, 'off'].concat(jobs), cb, eb);
}

exports.job = job;