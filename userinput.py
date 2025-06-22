# userinput.py

while True:
    inp = input("prompt: ")
    if not inp.strip():
        break
    print(f'NEXT_PROMPT: {inp}')
