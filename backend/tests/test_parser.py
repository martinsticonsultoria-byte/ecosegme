import pytest
from app.parser import extract_sonus_data, names_match, name_similarity


def test_names_match_exato():
    assert names_match("Joel Barroso", "Joel Barroso") is True


def test_names_match_case_insensitive():
    assert names_match("JOEL BARROSO", "joel barroso") is True


def test_names_match_acento():
    assert names_match("Eduardo Marafiga", "Eduardo Marafiga") is True


def test_names_nao_batem():
    assert names_match("Joel Barroso", "Matheus Silva") is False


def test_name_similarity_range():
    score = name_similarity("Joel Barroso", "Joel Barros")
    assert 0.0 <= score <= 1.0


def test_pdf_invalido():
    with pytest.raises(Exception):
        extract_sonus_data("/tmp/nao_existe.pdf")
