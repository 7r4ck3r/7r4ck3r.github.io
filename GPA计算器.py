print("--------------《GPA计算器（高级）》  Written by 7r4ck3r-----------------")
print("！！！！！！！！！！！！！输入模版：高数 5.5(学分）3.7（高数绩点）物理 2.5 4.0 体育 1 4.5 cs 1 EX(免修）！！！！！！！！！！！！ ")
k=input("请输入全部课程信息：")
Replace_Enter=k.replace("\n"," ") #将\n全部替换成空格
Info=Replace_Enter.split(" ") #根据空格分割全部信息，全部储存在列表Info中
Info_length=len(Info)
Course=[] #列表Course储存全部课程名
Credit=[] #列表Credit储存全部学分
Grade=[] #列表Grade储存全部成绩
for x in range(int(Info_length/3)):
    Course.append(Info[3*x]) #储存课程名
    Credit.append(Info[3*x+1]) #储存学分
    Grade.append(Info[3*x+2]) #储存绩点
    
All_course=[] #列表ALL_course储存全部课程的字典
Credit_sum=0 #Credit_sum表示总学分和
GPA_sum=0 #GPA_sum表示参与GPA计算的总学分和
Grade_point=0 #Grade_point表示总学分绩点乘积和

for x in range(int(Info_length/3)):
    All_course.append({})
    All_course[x]['课程名']=Course[x]
    All_course[x]['学分']=float(Credit[x])
    if Grade[x].isalpha(): 
        All_course[x]['绩点']=Grade[x]
        if Grade[x]=='P' or Grade[x]=='EX': #通过(P)或免修(EX)课程取得学分，不计入GPA计算
           Credit_sum=Credit_sum+float(Credit[x]) #总学分累加，参与GPA计算的总学分不累加
    else:
        All_course[x]['绩点']=float(Grade[x]) 
        Credit_sum=Credit_sum+float(Credit[x]) #总学分累加
        GPA_sum=GPA_sum+float(Credit[x]) #参与GPA计算的总学分累加
        Grade_point=Grade_point+float(Credit[x])*float(Grade[x]) #计算学分绩点乘积和
        
if GPA_sum!=0: #分母不能为0，若参与GPA计算的总学分为0，则GPA为0
    GPA=Grade_point/GPA_sum #计算最终的GPA
else:
    GPA=0
    
Control=input('输入以下命令执行不同操作：\n0、退出\n1、查询GPA\n2、查询总学分\n\
3、查询绩点高于GPA的科目\n您的选择（数字）：') #Control用于用户输入数字，进行交互
while Control!='0': #用户输入的Control不为0时，一直循环执行下列语句，直至用户输入0
    if Control=='1':
       print('你的GPA为%.2f'%GPA)
    elif Control=='2':
       print('总学分为%d'%Credit_sum)
    elif Control=='3':
       print('绩点高于GPA的科目有：')
       for x in range(int(Info_length/3)):
           if Grade[x].isalpha()!=True and float(Grade[x])-GPA>0.0001: #成绩以非字母的绩点形式给出，并且大于GPA
              print(All_course[x]) #输出成绩高于GPA的全部课程信息
    else: 
        print('输入错误！请输入正确的命令！') #用户输入不为0、1、2、3时，提示输入错误
    Control=input('请继续输入命令执行操作：') #用户上一次输入的不是0时，需要重新输入

print('已退出程序，感谢使用！')
     
