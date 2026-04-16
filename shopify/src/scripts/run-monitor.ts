import { MonitorService } from '../services/monitor';

async function runMonitor() {
  const monitor = new MonitorService();
  await monitor.syncInventory();
}

runMonitor().catch(console.error);
