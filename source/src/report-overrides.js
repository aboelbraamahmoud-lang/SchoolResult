/* 6.9.13 — corrected report implementations that depend on subject/teacher grouping. */
SRDepartmentStatsReport=function({page:e,exam:t,workspace:n}){
  const grades=[...new Set(e.allRows.map(row=>gj(row,t)).filter(Boolean))].sort((a,b)=>SR63.gradeOrder(a)-SR63.gradeOrder(b)||a.localeCompare(b,'ar',{numeric:true})),body=[];
  for(const grade of grades){
    const gradeRows=e.allRows.filter(row=>gj(row,t)===grade),classes=[...new Set(gradeRows.map(row=>hj(row,t)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
    body.push((0,q.jsx)(`tr`,{className:`dept-grade-banner`,children:(0,q.jsx)(`th`,{colSpan:9,children:grade})},`grade-${grade}`));
    for(const className of classes){
      const classRows=gradeRows.filter(row=>hj(row,t)===className),teacherNames=[...new Set(classRows.map(row=>mj(row,t)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})),groups=teacherNames.length?teacherNames:[`غير مربوط`];
      for(const teacher of groups){
        const rows=teacher===`غير مربوط`?classRows.filter(row=>!mj(row,t)):classRows.filter(row=>ij(mj(row,t))===ij(teacher)),m=bj(rows,t,n.settings),notEvaluated=m.absent+m.excused+m.unexcused+m.deprived;
        body.push((0,q.jsxs)(`tr`,{children:[
          (0,q.jsx)(`td`,{children:teacher}),
          (0,q.jsx)(`td`,{children:SR63.displayClass(className)}),
          (0,q.jsx)(`td`,{children:m.students}),
          (0,q.jsx)(`td`,{children:m.evaluated}),
          (0,q.jsx)(`td`,{children:notEvaluated}),
          (0,q.jsx)(`td`,{children:m.passed}),
          (0,q.jsx)(`td`,{children:m.failed}),
          (0,q.jsx)(`td`,{className:`dept-metric-cell`,children:SR63.renderReportValue(m.success,'success')}),
          (0,q.jsx)(`td`,{className:`dept-metric-cell`,children:SR63.renderReportValue(m.achievement,'achievement')})
        ]},`${className}-${teacher}`));
      }
    }
    const gm=bj(gradeRows,t,n.settings);
    body.push((0,q.jsxs)(`tr`,{className:`dept-grade-total`,children:[
      (0,q.jsx)(`td`,{colSpan:2,children:`على مستوى ${grade}`}),
      (0,q.jsx)(`td`,{children:gm.students}),(0,q.jsx)(`td`,{children:gm.evaluated}),
      (0,q.jsx)(`td`,{children:gm.absent+gm.excused+gm.unexcused+gm.deprived}),
      (0,q.jsx)(`td`,{children:gm.passed}),(0,q.jsx)(`td`,{children:gm.failed}),
      (0,q.jsx)(`td`,{className:`dept-metric-cell`,children:SR63.renderReportValue(gm.success,'success')}),
      (0,q.jsx)(`td`,{className:`dept-metric-cell`,children:SR63.renderReportValue(gm.achievement,'achievement')})
    ]},`total-${grade}`));
  }
  const overall=bj(e.allRows,t,n.settings);
  return(0,q.jsxs)(q.Fragment,{children:[
    (0,q.jsxs)(`div`,{className:`dept-report-meta`,children:[
      (0,q.jsxs)(`span`,{children:[`المادة: `,(0,q.jsx)(`b`,{children:e.subject})]}),
      (0,q.jsxs)(`span`,{children:[`منسق المادة: `,(0,q.jsx)(`b`,{children:SR63.subjectCoordinator(n,e.subject)||'—'})]}),
      (0,q.jsxs)(`span`,{children:[`التقييم: `,(0,q.jsx)(`b`,{children:tj(n.settings,t).name})]})
    ]}),
    (0,q.jsxs)(`table`,{className:`report-table dept-stats-table`,children:[
      (0,q.jsx)(`thead`,{children:(0,q.jsxs)(`tr`,{children:[`اسم المعلم`,`الشعبة`,`عدد الطلاب`,`حاضر/مقيم`,`غير مقيم`,`ناجح`,`راسب`,`نسبة النجاح`,`نسبة التحصيل`].map(h=>(0,q.jsx)(`th`,{children:h},h))})}),
      (0,q.jsx)(`tbody`,{children:body}),
      (0,q.jsx)(`tfoot`,{children:(0,q.jsxs)(`tr`,{children:[
        (0,q.jsx)(`th`,{colSpan:2,children:`على مستوى المادة`}),(0,q.jsx)(`th`,{children:overall.students}),(0,q.jsx)(`th`,{children:overall.evaluated}),
        (0,q.jsx)(`th`,{children:overall.absent+overall.excused+overall.unexcused+overall.deprived}),(0,q.jsx)(`th`,{children:overall.passed}),(0,q.jsx)(`th`,{children:overall.failed}),
        (0,q.jsx)(`th`,{className:`dept-metric-cell`,children:SR63.renderReportValue(overall.success,'success')}),(0,q.jsx)(`th`,{className:`dept-metric-cell`,children:SR63.renderReportValue(overall.achievement,'achievement')})
      ]})})
    ]})
  ]});
};
