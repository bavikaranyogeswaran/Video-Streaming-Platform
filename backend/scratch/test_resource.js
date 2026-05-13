const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

try {
  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'test-service',
  });
  console.log('Resource created successfully:', resource);
} catch (e) {
  console.error('Failed to create resource:', e);
}
