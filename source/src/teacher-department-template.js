/* 6.10.31 — use precisely the same official Word template as the teacher report.
   The original teacher DOCX controls header, typography, layout, margins,
   ministry logo, description, and signature placement for both outputs. */
SR63.departmentQuantWordBuild=function(analysis,edits={}){
 if(!analysis||!analysis.grades)throw Error('لا توجد بيانات للقسم المختار.');
 const groupOrder=['7','8','9'];
 const groups=groupOrder.map(grade=>({
  ...analysis.grades[grade],className:analysis.grades[grade]?.label||({7:'السابع',8:'الثامن',9:'التاسع'}[grade]),
  currentAchievement:analysis.grades[grade]?.achievement??null
 }));
 const shared={
  ...analysis,groups,prevExam:analysis.previousExam||null,prevExamName:analysis.previousExamName||null,
  teacher:analysis.coordinator||'—',currentAchievement:analysis.achievement??null,
  departmentName:analysis.departmentName||analysis.subjectLabel,
  subjectLabel:analysis.subjectLabel||analysis.departmentName
 };
 return SR63.teacherQuantitativeWordBuild(shared,{...edits,departmentMode:true});
};
