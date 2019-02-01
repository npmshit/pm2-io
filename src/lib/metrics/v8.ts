import * as v8 from 'v8'
import { MetricService, Metric } from '../services/metrics'
import { MetricInterface } from '../features/metrics'
import Debug from '@modernjs/debug'
import { ServiceManager } from '../serviceManager'
import Gauge from '../utils/metrics/gauge'

export interface V8MetricsConfig extends Record<string, boolean> {
  new_space: boolean
  old_space: boolean
  map_space: boolean
  code_space: boolean
  large_object_space: boolean
  heap_total_size: boolean
  heap_used_size: boolean
  heap_used_percent: boolean
}

const defaultOptions: V8MetricsConfig = {
  new_space: false,
  old_space: false,
  map_space: false,
  code_space: false,
  large_object_space: false,
  heap_total_size: true,
  heap_used_size: true,
  heap_used_percent: true
}

export default class V8Metric implements MetricInterface {

  private timer: NodeJS.Timer | undefined
  private TIME_INTERVAL: number = 800
  private metricService: MetricService | undefined
  private logger: Function = Debug('axm:features:metrics:v8')
  private metricStore: Map<string, Gauge> = new Map<string, Gauge>()

  private unitKB = 'MiB'

  private metricsDefinitions = {
    total_heap_size: {
      name: 'Heap Size',
      id: 'internal/v8/heap/total',
      unit: this.unitKB,
      historic: true
    },
    heap_used_percent: {
      name: 'Heap Usage',
      id: 'internal/v8/heap/usage',
      unit: '%',
      historic: true
    },
    used_heap_size: {
      name: 'Used Heap Size',
      id: 'internal/v8/heap/used',
      unit: this.unitKB,
      historic: true
    }
  } as Record<string, any>

  init (config: V8MetricsConfig | boolean = defaultOptions) {
    if (config === false) return
    if (config === true) {
      config = defaultOptions
    }

    this.metricService = ServiceManager.get('metrics')
    if (this.metricService === undefined) return this.logger('Failed to load metric service')
    this.logger('init')

    if (!v8.hasOwnProperty('getHeapStatistics')) {
      return this.logger(`V8.getHeapStatistics is not available, aborting`)
    }

    for (let metricName in this.metricsDefinitions) {
      if (config[metricName] === false) continue
      const isEnabled: boolean = config[metricName]
      if (isEnabled === false) continue
      let metric: Metric = this.metricsDefinitions[metricName]
      this.metricStore.set(metricName, this.metricService.metric(metric))
    }

    this.timer = setInterval(() => {
      const stats = v8.getHeapStatistics() as Record<string, any>
      // update each metrics that we declared
      for (let metricName in this.metricsDefinitions) {
        if (typeof stats[metricName] !== 'number') continue
        const gauge = this.metricStore.get(metricName)
        if (gauge === undefined) continue
        gauge.set(this.formatMiBytes(stats[metricName]))
      }
      // manually compute the heap usage
      const usage = (stats.used_heap_size / stats.total_heap_size * 100).toFixed(2)
      const usageMetric = this.metricStore.get('heap_used_percent')
      if (usageMetric !== undefined) {
        usageMetric.set(parseFloat(usage))
      }
    }, this.TIME_INTERVAL)

    this.timer.unref()
  }

  destroy () {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
    }
    this.logger('destroy')
  }

  private formatMiBytes (val: number) {
    return (val / 1024 / 1024).toFixed(2)
  }
}
