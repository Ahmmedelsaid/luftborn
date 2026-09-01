/**
 * json-server middlewares: artificial latency so loading states are observable,
 * and opt-in failure injection so retry logic can be exercised on demand
 * without making the app flaky.
 *
 * `MOCK_API_DELAY_MS` (default 300) tunes latency.
 * `MOCK_API_ERROR_RATE` (default 0) fails that fraction of requests.
 * `?__fail=<status>` forces a single failure response.
 */

const DEFAULT_DELAY_MS = 300;

const delayMs = Number.parseInt(process.env['MOCK_API_DELAY_MS'] ?? '', 10);
const errorRate = Number.parseFloat(process.env['MOCK_API_ERROR_RATE'] ?? '') || 0;

function latency(req, res, next) {
  const ms = Number.isFinite(delayMs) ? delayMs : DEFAULT_DELAY_MS;
  if (ms <= 0) {
    next();
    return;
  }
  setTimeout(next, ms);
}

function failureInjection(req, res, next) {
  const requested = Number.parseInt(req.query['__fail'] ?? '', 10);

  if (Number.isFinite(requested) && requested >= 400 && requested <= 599) {
    res.status(requested).jsonp({ message: `Simulated ${requested} for ${req.path}` });
    return;
  }

  if (errorRate > 0 && Math.random() < errorRate) {
    res.status(503).jsonp({ message: 'Simulated upstream failure (MOCK_API_ERROR_RATE)' });
    return;
  }

  next();
}

/** Keeps control-only params out of json-server's own filtering. */
function stripControlParams(req, _res, next) {
  delete req.query['__fail'];
  next();
}

module.exports = [failureInjection, stripControlParams, latency];
