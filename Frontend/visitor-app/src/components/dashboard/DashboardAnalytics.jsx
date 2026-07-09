import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'

function buildBaseOptions() {
  return {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: '#334155',
      fontFamily: 'inherit',
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
      padding: { left: 6, right: 6, top: 6, bottom: 0 },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: 'light' },
  }
}

export function VisitorTrendArea({ labels = [], visitors = [], preRegs = [] }) {
  const options = useMemo(
    () => ({
      ...buildBaseOptions(),
      chart: { ...buildBaseOptions().chart, type: 'area', height: 280 },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { rotate: 0, trim: true },
      },
      stroke: { curve: 'smooth', width: 3 },
      colors: ['#2563eb', '#7c3aed'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.25,
          opacityTo: 0.02,
          stops: [0, 90, 100],
        },
      },
      yaxis: { min: 0, forceNiceScale: true },
    }),
    [labels],
  )

  const series = useMemo(
    () => [
      { name: 'Visitors', data: visitors },
      { name: 'Pre-registrations', data: preRegs },
    ],
    [preRegs, visitors],
  )

  return (
    <div className="vm-chart-card">
      <div className="vm-chart-card-inner">
        <ReactApexChart options={options} series={series} type="area" height={280} />
      </div>
    </div>
  )
}

export function ApprovalDonut({ labels = [], values = [] }) {
  const options = useMemo(
    () => ({
      ...buildBaseOptions(),
      chart: { ...buildBaseOptions().chart, type: 'donut', height: 260 },
      labels,
      colors: ['#f97316', '#22c55e', '#ef4444', '#94a3b8'],
      stroke: { width: 3, colors: ['#ffffff'] },
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
          },
        },
      },
    }),
    [labels],
  )

  return (
    <div className="vm-chart-card">
      <div className="vm-chart-card-inner">
        <ReactApexChart options={options} series={values} type="donut" height={260} />
      </div>
    </div>
  )
}

export function WeeklyBar({ labels = [], values = [] }) {
  const options = useMemo(
    () => ({
      ...buildBaseOptions(),
      chart: { ...buildBaseOptions().chart, type: 'bar', height: 260 },
      colors: ['#2563eb'],
      plotOptions: {
        bar: {
          borderRadius: 10,
          columnWidth: '45%',
        },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { min: 0, forceNiceScale: true },
    }),
    [labels],
  )

  const series = useMemo(() => [{ name: 'Visitors', data: values }], [values])

  return (
    <div className="vm-chart-card">
      <div className="vm-chart-card-inner">
        <ReactApexChart options={options} series={series} type="bar" height={260} />
      </div>
    </div>
  )
}

