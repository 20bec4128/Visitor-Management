import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'

function formatDayLabel(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = date.toLocaleString('en', { month: 'short' })
  return `${d}-${m}`
}

function buildLastDays(count) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(d)
  }
  return days
}

function VisitorHistoryChart({ labels: labelsProp, series: seriesProp }) {
  const days = useMemo(() => buildLastDays(14), [])
  const labels = useMemo(() => {
    if (Array.isArray(labelsProp) && labelsProp.length > 0) return labelsProp
    return days.map(formatDayLabel)
  }, [days, labelsProp])

  const defaultValues = useMemo(() => {
    const v = Array(14).fill(0)
    v[10] = 2
    return v
  }, [])

  const defaultSeries = useMemo(() => [{ name: 'Visitors', data: defaultValues, color: '#13C2C2' }], [defaultValues])

  const { chartSeries, colors } = useMemo(() => {
    const raw = Array.isArray(seriesProp) && seriesProp.length > 0 ? seriesProp : defaultSeries
    const safe = raw
      .map((item) => ({
        name: item?.name ?? 'Series',
        data: Array.isArray(item?.data) ? item.data : [],
        color: item?.color,
      }))
      .filter((item) => item.data.length > 0)

    if (safe.length === 0) {
      return {
        chartSeries: defaultSeries.map((s) => ({ name: s.name, data: s.data })),
        colors: defaultSeries.map((s) => s.color).filter(Boolean),
      }
    }

    return {
      chartSeries: safe.map((s) => ({ name: s.name, data: s.data })),
      colors: safe.map((s) => s.color).filter(Boolean),
    }
  }, [defaultSeries, seriesProp])

  const options = useMemo(
    () => ({
      chart: {
        height: 320,
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: colors.length > 0 ? colors : ['#13C2C2'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.25,
          opacityTo: 0.02,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
        padding: { left: 0, right: 0 },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
      },
      tooltip: { theme: 'light' },
    }),
    [colors, labels],
  )

  return (
    <div className="vm-chart-wrap">
      <ReactApexChart options={options} series={chartSeries} type="area" height={320} />
    </div>
  )
}

export default VisitorHistoryChart
