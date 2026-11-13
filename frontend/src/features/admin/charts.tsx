import { useId, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Single-series charts: one hue for every mark, text stays in text tokens.
const MARK = '#0b7d75'
const GRID = '#e3e8ef'
const AXIS_TEXT = '#667085'
const TOOLTIP_STYLE = { borderRadius: 8, border: '1px solid #e3e8ef', boxShadow: '0 4px 12px rgba(16,32,59,.08)', fontSize: 13 }

export interface Datum {
  label: string
  value: number
}

interface ChartFrameProps {
  title: string
  description?: string
  data: Datum[]
  valueLabel: string
  children: React.ReactNode
}

/** Card + caption + an always-available data table (the accessible alternative to the graphic). */
function ChartFrame({ title, description, data, valueLabel, children }: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  return (
    <figure className="ag-card ag-card-body mb-0 h-100">
      <figcaption className="mb-2">
        <h2 className="h3 mb-0">{title}</h2>
        {description && <p className="small text-muted mb-0">{description}</p>}
      </figcaption>
      {data.length === 0 ? (
        <p className="small text-muted py-4 text-center mb-0">No data yet.</p>
      ) : (
        <>
          <div aria-hidden="true">{children}</div>
          <button type="button" className="btn btn-sm btn-ghost ps-0" aria-expanded={showTable} aria-controls={tableId} onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Hide data table' : 'Show data table'}
          </button>
          {/* Screen readers always get the table; sighted users can toggle it. */}
          <div id={tableId} className={showTable ? '' : 'visually-hidden'}>
            <table className="table ag-table table-sm mt-2">
              <caption className="visually-hidden">{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="text-end">{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.label}>
                    <td>{d.label}</td>
                    <td className="text-end">{d.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  )
}

/** Horizontal bars: readable category names on narrow screens, value at each bar tip. */
export function HorizontalBarChart({ title, description, data, valueLabel = 'Reports' }: { title: string; description?: string; data: Datum[]; valueLabel?: string }) {
  const height = Math.max(160, data.length * 36 + 32)
  return (
    <ChartFrame title={title} description={description} data={data} valueLabel={valueLabel}>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeWidth={1} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={118} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
            <Tooltip cursor={{ fill: 'rgba(23,43,77,0.05)' }} contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), valueLabel]} />
            <Bar dataKey="value" fill={MARK} radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
              <LabelList dataKey="value" position="right" fill="#202b38" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}

export function TrendLineChart({ title, description, data, valueLabel = 'Reports' }: { title: string; description?: string; data: Datum[]; valueLabel?: string }) {
  const last = data[data.length - 1]
  return (
    <ChartFrame title={title} description={description} data={data} valueLabel={valueLabel}>
      <div className="ag-chart">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 16, right: 24, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="label" tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} width={36} tick={{ fill: AXIS_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }} contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString(), valueLabel]} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={MARK}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; index?: number }) =>
                props.index === data.length - 1 ? (
                  <circle key="end" cx={props.cx} cy={props.cy} r={4} fill={MARK} stroke="#fff" strokeWidth={2} />
                ) : (
                  <g key={props.index} />
                )
              }
              activeDot={{ r: 5, fill: MARK, stroke: '#fff', strokeWidth: 2 }}
            >
              {last && <LabelList dataKey="value" content={(p: { x?: number | string; y?: number | string; index?: number; value?: number | string }) => (p.index === data.length - 1 ? <text x={Number(p.x)} y={Number(p.y) - 10} textAnchor="middle" fontSize={12} fill="#202b38">{p.value}</text> : null)} />}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
