const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const oldPipeline = `        const pipelineStages = [
          'Confirmation Call',
          'Courier Booking',
          'Factory Submit',
          'Courier Pending',
          'Delivered',
          'Partial Delivered',
          'Returned from Customer',
          'Returned Received'
        ];`;

const newPipeline = `        const pipelineStages = [
          'Confirmation Call',
          'Courier Booking',
          'Factory Submit'
        ];`;

content = content.replace(oldPipeline, newPipeline);
fs.writeFileSync('app.js', content);
