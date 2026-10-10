/*
 * Multi-section import guard (6.10.5).
 * "الرقم" in the traditional per-class result sheet is a row ordinal, not
 * an academic student ID. Genuine identifiers require an explicit ID header.
 * Sections and repeated table headers must never silently discard pupils.
 */
SR63.importOfficialStudentId=function(value,header){
  const normalized=ij(header??'');
  // Academic/student identifiers must be unambiguous. A column simply headed
  // "الرقم" is the numbering 1..N that restarts in each class.
  const official=['الرقم الأكاديمي','رقم الطالب','student id','studentid','student number','student no','student_id','student number id','رقم أكاديمي','الرقم المدرسي'];
  return official.some(label=>ij(label)===normalized)?C9(value):'';
};
SR63.readLegacyWorkbook=function(book,fileName,settings){
  const parsed=srLegacyImport(book,fileName,settings);
  for(const sheet of parsed.sheets){
    const matrix=Gv.sheet_to_json(book.Sheets[sheet.sheet],{header:1,raw:true,defval:null,blankrows:true});
    const headerIndex=sheet.headerRow-1,headers=matrix[headerIndex]??[],aliases=settings.importAliases??QA;
    const findHeader=(names)=>headers.findIndex(h=>names.some(name=>ij(name)===ij(h)));
    const nameCol=findHeader(aliases.studentName),classCol=findHeader(aliases.className),idCol=findHeader(aliases.studentId);
    if(nameCol<0||classCol<0)continue;
    const idLabel=idCol<0?'':C9(headers[idCol]);
    const existing=new Map(sheet.rows.map(row=>[row.sourceRow,row]));
    const checked=[],warnings=[],repairedRows=new Set(),headingRows=new Set();
    let inheritedClass='';
    for(let index=headerIndex+1;index<matrix.length;index++){
      const values=matrix[index]??[],sourceRow=index+1;
      const name=C9(values[nameCol]),rawClass=C9(values[classCol]);
      const rawNumber=idCol>=0?C9(values[idCol]):'';
      const normalizedName=ij(name),normalizedClass=ij(rawClass);
      const repeatedHeader=normalizedName&&aliases.studentName.some(label=>ij(label)===normalizedName)
        &&aliases.className.some(label=>ij(label)===normalizedClass);
      if(repeatedHeader){headingRows.add(sourceRow);continue;}
      // A section marker such as "الشعبة | 07/2" is not a pupil.
      if(!name&&D9(lj(rawClass))){inheritedClass=lj(rawClass);headingRows.add(sourceRow);continue;}
      let className=rawClass?lj(rawClass):inheritedClass;
      // A normal row with its own class value starts a new grouping scope.
      if(name&&D9(className)&&rawClass)inheritedClass=className;
      if(!name)continue;
      let entry=existing.get(sourceRow);
      if(!entry&&!D9(className))continue; // preserve original diagnostic for incomplete data
      if(!entry){
        const scoreValues={};
        for(const column of sheet.scoreColumns){
          const raw=values[column.index],score=T9(raw),status=E9(raw,score!==null,settings);
          scoreValues[column.key]={score,status:status.status,raw:C9(raw),recognized:status.recognized};
        }
        entry={id:`${fileName}-${sheet.sheet}-${sourceRow}`,studentId:'',studentName:name,grade:uj(className),className,sourceRow,values:scoreValues};
        repairedRows.add(sourceRow);
        warnings.push({severity:'warning',row:sourceRow,sheet:sheet.sheet,message:`تم استكمال الشعبة ${className} للطالب «${name}» من عنوان المجموعة السابق.`});
      }
      if(!D9(entry.className)||!D9(className))continue;
      // Explicit class values remain authoritative; never replace with first class.
      const exactClass=rawClass?lj(rawClass):className;
      entry.className=exactClass;
      entry.grade=uj(exactClass);
      entry.studentId=SR63.importOfficialStudentId(rawNumber,idLabel)||SR63.stableStudentId(name,exactClass);
      checked.push(entry);
    }
    sheet.rows=checked;
    // Obsolete "ignored missing section" messages are no longer applicable
    // where that particular source row has been recovered.
    sheet.issues=sheet.issues.filter(issue=>!headingRows.has(issue.row)&&!(repairedRows.has(issue.row)&&/تجاهل صف ناقص|تجاهل صف بلا|الشعبة/.test(issue.message)));
    sheet.issues.push(...warnings);
    if(!sheet.rows.length&&!sheet.issues.some(issue=>issue.severity==='error'))sheet.issues.push({severity:'error',row:0,sheet:sheet.sheet,message:'لم يتم العثور على طلاب صالحين في ورقة النتيجة.'});
  }
  return parsed;
};
