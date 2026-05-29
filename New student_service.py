# student_service.py — replace entire file with this
from student_db import load_students, store_student, get_student_by_id, update_student, delete_student,get_all_students

def create_student(name, student_class, roll_no, file_url=None):
    return store_student(name, student_class, roll_no, file_url)

def get_students():
    return get_all_students()

def get_student(student_id):
    return get_student_by_id(student_id)

def update_student_service(student_id, name, student_class, roll_no, file_url=None):
    return update_student(student_id, name, student_class, roll_no, file_url)

def delete_student_service(student_id):
    return delete_student(student_id)
