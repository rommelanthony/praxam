// Dev preview: renders one example of each chart type using ChartPassage.
// Visit http://localhost:3000/dev/charts to verify the renderer.
'use client';
import ChartPassage from '@/components/practice/ChartPassage';

const SAMPLES: Array<{ label: string; passage: string }> = [
  {
    label: 'bar',
    passage: JSON.stringify({
      __chart__: true,
      type: 'bar',
      title: 'NHS A&E Average Wait Times — 2023',
      yLabel: 'Hours',
      xKey: 'hospital',
      series: [{ key: 'wait', label: 'Avg wait (hrs)' }],
      data: [
        { hospital: 'Royal', wait: 4.1 },
        { hospital: 'City', wait: 3.8 },
        { hospital: 'St Thomas', wait: 5.2 },
        { hospital: 'Northgate', wait: 2.9 },
        { hospital: 'Eastfield', wait: 4.6 },
      ],
      note: 'NHS target: all patients seen within 4 hours',
    }),
  },
  {
    label: 'line',
    passage: JSON.stringify({
      __chart__: true,
      type: 'line',
      title: 'NHS Elective Waiting List Size — 2019 to 2023 (millions)',
      yLabel: 'Patients waiting (M)',
      xKey: 'year',
      series: [
        { key: 'waiting', label: 'Total waiting' },
        { key: 'over52', label: 'Waiting >52 weeks' },
      ],
      data: [
        { year: '2019', waiting: 4.2, over52: 0.09 },
        { year: '2020', waiting: 4.8, over52: 0.22 },
        { year: '2021', waiting: 5.6, over52: 1.54 },
        { year: '2022', waiting: 6.8, over52: 2.89 },
        { year: '2023', waiting: 7.6, over52: 3.11 },
      ],
    }),
  },
  {
    label: 'stacked_bar',
    passage: JSON.stringify({
      __chart__: true,
      type: 'stacked_bar',
      title: 'NHS Prescription Items by Type — 2023 (millions)',
      yLabel: 'Items (M)',
      xKey: 'quarter',
      series: [
        { key: 'generic', label: 'Generic' },
        { key: 'branded', label: 'Branded' },
        { key: 'appliance', label: 'Appliances' },
      ],
      data: [
        { quarter: 'Q1', generic: 218, branded: 42, appliance: 18 },
        { quarter: 'Q2', generic: 224, branded: 38, appliance: 19 },
        { quarter: 'Q3', generic: 231, branded: 35, appliance: 21 },
        { quarter: 'Q4', generic: 242, branded: 31, appliance: 22 },
      ],
    }),
  },
  {
    label: 'grouped_bar',
    passage: JSON.stringify({
      __chart__: true,
      type: 'grouped_bar',
      title: 'UK Regional Energy Consumption by Sector — 2023 (TWh)',
      yLabel: 'TWh',
      xKey: 'region',
      series: [
        { key: 'res', label: 'Residential' },
        { key: 'com', label: 'Commercial' },
        { key: 'ind', label: 'Industrial' },
      ],
      data: [
        { region: 'North East', res: 18.4, com: 12.1, ind: 24.7 },
        { region: 'South West', res: 22.1, com: 15.8, ind: 18.3 },
        { region: 'Midlands', res: 31.6, com: 24.3, ind: 42.1 },
        { region: 'London', res: 28.9, com: 45.2, ind: 12.8 },
        { region: 'Scotland', res: 24.7, com: 18.4, ind: 31.2 },
      ],
    }),
  },
  {
    label: 'pie',
    passage: JSON.stringify({
      __chart__: true,
      type: 'pie',
      title: 'NHS England Workforce by Staff Group — 2023',
      xKey: 'group',
      series: [{ key: 'count', label: 'Staff (thousands)' }],
      data: [
        { group: 'Nurses', count: 352 },
        { group: 'Doctors', count: 124 },
        { group: 'Allied Health', count: 186 },
        { group: 'Admin/Clerical', count: 268 },
        { group: 'Other', count: 94 },
      ],
    }),
  },
  {
    label: 'venn (2-set)',
    passage: JSON.stringify({
      __chart__: true,
      type: 'venn',
      title: 'Medical Students by Extracurricular Activity',
      xKey: 'set',
      series: [],
      sets: [
        { label: 'Research', value: 0, color: '#0d9488' },
        { label: 'Sports', value: 0, color: '#1e3a5f' },
      ],
      intersections: [
        { sets: ['Research'], value: 48 },
        { sets: ['Sports'], value: 62 },
        { sets: ['Research', 'Sports'], value: 24 },
      ],
      note: 'A medical school has 200 students. 38 do neither activity.',
    }),
  },
  {
    label: 'venn (3-set, synthetic)',
    passage: JSON.stringify({
      __chart__: true,
      type: 'venn',
      title: 'Survey: Hobbies among 100 students',
      xKey: 'set',
      series: [],
      sets: [
        { label: 'Music', value: 0, color: '#0d9488' },
        { label: 'Sport', value: 0, color: '#1e3a5f' },
        { label: 'Art', value: 0, color: '#7c3aed' },
      ],
      intersections: [
        { sets: ['Music'], value: 60 },
        { sets: ['Sport'], value: 50 },
        { sets: ['Art'], value: 40 },
        { sets: ['Music', 'Sport'], value: 25 },
        { sets: ['Music', 'Art'], value: 20 },
        { sets: ['Sport', 'Art'], value: 15 },
        { sets: ['Music', 'Sport', 'Art'], value: 10 },
      ],
    }),
  },
];

export default function ChartsPreview() {
  return (
    <div className="container-px py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-navy mb-6">Chart renderer preview</h1>
      <p className="text-[14px] text-ink-soft mb-8">
        One example of each chart type. Verify visually before unflagging the 70 needs_renderer questions.
      </p>
      {SAMPLES.map(({ label, passage }) => (
        <section key={label} className="mb-8">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-teal-deep mb-3">
            {label}
          </h2>
          <div className="bg-surface border border-line rounded-lg p-5">
            <ChartPassage passage={passage} />
          </div>
        </section>
      ))}
    </div>
  );
}
