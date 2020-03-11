const COOKIE_NAME = 'play_along_settings';
const RADIUS = 65;
const NORMAL_POINT_SIZE = 5;
const LARGE_POINT_SIZE = 10;
const CENTER_X = 150;
const CENTER_Y = 75;
const FIRST_NOTE_INDEX = 5;
const BLACK_HEX = '#000000';
const WHITE_HEX = '#FFFFFF';
const TRIGGER_NOTE = 'X';
const intervalMapping = {
  '4n': {
    name: '4th notes',
    notes: ['1', '2', '3', '4']
  },
  '8n': {
    name: '8th notes',
    notes: ['1', '&', '2', '&', '3', '&', '4', '&']
  },
  '8t': {
    name: '8th note triplets',
    notes: ['1', '&', 'a', '2', '&', 'a', '3', '&', 'a', '4', '&', 'a']
  },
  '16n': {
    name: '16th notes',
    notes: ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a']
  }
};
var totalCurrentBar = 0;
var CANVAS_DRAW_COLOR = BLACK_HEX;
var nextAvailableSoundGroupId = 0;
var soundGroupingsFetched = 0;
var isPlaying = false;
var colIndex = FIRST_NOTE_INDEX;
var soundsForEachType = {};
var barCount = 2;
var grooveName = 'Master Blaster';
var onlyShowActiveBar = false;
var settings = {
  dark_mode: false,
  show_selectors: true,
  show_active_bar: false,
  custom_grooves: []
};
var interval;
var expectedSoundGroupings;
var soundGroupings;
var data;
var $grooveSelectElement;
var $grooveSelectionsElement;
var loopId;
var $bpmCurrent;
var $bpmElement;
var $togglePlaybackElement;
var $addBarElement;
var $deleteBarElement;
var $resetGrooveElement;
var $hamburgerElement;
var $detailsElement;
var $volumeElement;
var $muteElement;
var $exportGrooveElement;
var $importGrooveElement;
var $settingsElement;
var $settingsNavElement;
var $intervalOptions;
var $toggleGroupingConfigs;
var $barsVisible;
var $closeImportGrooveModalElement;
var $copyExportedGrooveElement;
var $cookiePermission;
var $exportForm;

$(document).ready(function() {
  $bpmElement = $('#bpm');
  $togglePlaybackElement = $('#toggle_playback');
  $addBarElement = $('#add_bar');
  $deleteBarElement = $('#delete_bar');
  $resetGrooveElement = $('#reset_groove');
  $detailsElement = $('#details');
  $volumeElement = $('#volume');
  $muteElement = $('#mute');
  $exportGrooveElement = $('#export_groove');
  $importGrooveElement = $('#import_groove');
  $settingsElement = $('#settings');
  $hamburgerElement = $('#hamburger_button');
  $intervalOptions = $('#interval_list .dropdown-item');
  $toggleGroupingConfigs = $('#toggle_grouping_configs');
  $barsVisible = $('#bars_visible');
  $grooveSelectionsElement = $('#groove_selections');
  $cookiePermission = $('.cookie_permission');
  $saveGrooveToCookie = $('#save_groove_to_cookie');
  $settingsNavElement = $('#settings_quick');
  $closeImportGrooveModalElement = $('#close_import_groove_modal');
  $copyExportedGrooveElement = $('#copy_exported_groove');
  $exportForm = $('#export_form');

  $muteElement.on('change', handleMuteToggle);
  $volumeElement.on('input change', handleVolumeChange);
  $detailsElement.submit(handlePlaybackToggle);
  $('.dark_toggle').on('click', handleDarkModeToggle);
  $copyExportedGrooveElement.on('click', handleCopyExportedGroove);
  $toggleGroupingConfigs.on('click', handleGroupingConfigToggle);
  $barsVisible.on('click', handleBarsVisibleToggle);
	$bpmElement.on('keyup', handleBpmKeyPress);
  $addBarElement.on('click', handleAddBar);
  $deleteBarElement.on('click', handleDeleteBar);
  $resetGrooveElement.on('click', handleResetGroove);
  $hamburgerElement.on('click', handleHamburgerToggle);
  $intervalOptions.on('click', handleIntervalChange);
  $cookiePermission.on('click', handleCookiePermissionToggle);
  $exportForm.on('submit', handleExportForm);
  $saveGrooveToCookie.on('click', handleSaveGrooveToCookie);
  $exportGrooveElement.on('click', handleGrooveExport);
  $importGrooveElement.on('click', handleGrooveImport);
  $settingsElement.on('click', handleSettings);
  $settingsNavElement.on('click', handleSettings);
  $closeImportGrooveModalElement.on('click', handleGrooveImportModalClose);
  $(document).click(ensureDropdownsAreClosed);

  initializeInterface();
});

function handleMuteToggle() {
  Tone.Master.mute = this.checked;
}

function handleVolumeChange() {
  for (var i = 0; i < soundGroupings.length; i++) {
    soundGroupings[i].audio.volume.value = this.value;
  }
}

function handleExportForm() {
  var grooveJson = document.getElementById('export_modal_body').textContent;
  settings.custom_grooves.push(grooveJson);
  setCookie(COOKIE_NAME, JSON.stringify(settings));
  return false;
}

function handleSaveGrooveToCookie() {}

function handleCookiePermissionToggle() {
  var cookie;
  if (this.checked) {
    cookie = getCookie(COOKIE_NAME);
    if (cookie === null || cookie === undefined) {
      setCookie(COOKIE_NAME, JSON.stringify(settings));
    } else {
      var updatedSettings = JSON.parse(cookie);
      if (updatedSettings.dark_mode === null || updatedSettings.dark_mode === undefined) {
        settings.dark_mode = false;
      } else {
        settings.dark_mode = updatedSettings.dark_mode;
      }
      if (settings.dark_mode) {
        if (!document.body.classList.contains('dark_theme_bg_color')) {
          handleDarkModeToggle();
        }
      }

      if (updatedSettings.show_selectors === null || updatedSettings.show_selectors === undefined) {
        settings.show_selectors = true;
      } else {
        settings.show_selectors = updatedSettings.show_selectors;
      }
      if (settings.show_selectors) {
        $('.hideable_column').css('display', '');
        $toggleGroupingConfigs.prop('checked', true);
      } else {
        $('.hideable_column').css('display', 'none');
        $toggleGroupingConfigs.prop('checked', false);
      }

      if (updatedSettings.show_active_bar === null || updatedSettings.show_active_bar === undefined) {
        settings.show_active_bar = false;
      } else {
        settings.show_active_bar = updatedSettings.show_active_bar;
      }
      if (settings.show_active_bar) {
        onlyShowActiveBar = true;
        $('.member_of_bars').css('display', 'none');
        $barsVisible.prop('checked', true);
      } else {
        onlyShowActiveBar = false;
        $('.member_of_bars').css('display', '');
        $barsVisible.prop('checked', false);
      }

      if (updatedSettings.custom_grooves === null || updatedSettings.custom_grooves === undefined) {
        settings.custom_grooves = [];
      } else {
        settings.custom_grooves = updatedSettings.custom_grooves;
      }
    }

    document.getElementById('cookie_data').textContent = JSON.stringify(JSON.parse(cookie), null, 2);
  } else {
    eraseCookie(COOKIE_NAME);
  }
}

function handleCopyExportedGroove() {
  //copyToClipboard($('#export_modal_body').html());
}

function handleBarsVisibleToggle() {
  onlyShowActiveBar = !onlyShowActiveBar;
  $('.member_of_bars').css('display', '');
  settings.show_active_bar = onlyShowActiveBar;
  if (settings.show_active_bar !== JSON.parse(getCookie(COOKIE_NAME)).show_active_bar) {
    setCookie(COOKIE_NAME, JSON.stringify(settings));
  }
}

function handleGroupingConfigToggle() {
  if (this.checked) {
    settings.show_selectors = true;
    $('.hideable_column').css('display', '');
  } else {
    settings.show_selectors = false;
    $('.hideable_column').css('display', 'none');
  }
  if (document.getElementsByClassName('cookie_permission')[0].checked) {
    setCookie(COOKIE_NAME, JSON.stringify(settings));
  }
}

function handleHamburgerToggle() {
  document.getElementById('animated_icon').classList.toggle('open');
}

function ensureDropdownsAreClosed(e) {
  $clicked = $(e.currentTarget);
  if ($clicked.closest('.dropdown').length === 0) {
    $('.dropdown').removeClass('show');
    $('.dropdown-menu').removeClass('show');
  }
}

function handleIntervalChange() {
  interval = this.getAttribute('data-interval');
  $('#interval_button').text(intervalMapping[interval].name);

  isPlaying = false;
  Tone.Transport.stop();
  Tone.Transport.clear(loopId);
  colIndex = FIRST_NOTE_INDEX;
  var animatedNotation = document.getElementById('animated_notation');
  animatedNotation.parentNode.removeChild(animatedNotation);
  var circlesTable = document.getElementById('circles_table');
  circlesTable.parentNode.removeChild(circlesTable);

  drawNotationTable();
  drawCirclesWithNotes();

  reset();
}

function handleResetGroove() {
  isPlaying = false;
  Tone.Transport.stop();
  Tone.Transport.clear(loopId);
  colIndex = FIRST_NOTE_INDEX;
  var animatedNotation = document.getElementById('animated_notation');
  animatedNotation.parentNode.removeChild(animatedNotation);
  var circlesTable = document.getElementById('circles_table');
  circlesTable.parentNode.removeChild(circlesTable);
  drawVisuals();
  document.getElementById('counter').innerHTML = '0:0:0';
  totalCurrentBar = 0;
  $togglePlaybackElement.attr('disabled', false);
  reset();
}

function handleBpmKeyPress() {
  if (this.value >= 10 && this.value <= 250) {
    Tone.Transport.bpm.value = this.value;
  } else if (this.value < 10 || this.value > 250) {
    $togglePlaybackElement.click();
  }
}

function handleAddBar() {
  var animatedNotation = document.getElementById('animated_notation');
  var $cell;
  for (var k = 0; k < intervalMapping[interval].notes.length; k++) {
    $cell = $('<th>').text(intervalMapping[interval].notes[k]).addClass('note_table_cell').addClass('bold');
    if (document.body.classList.contains('dark_theme_bg_color')) {
      $cell.addClass('white_text_dark_mode');
    }
    $(animatedNotation.rows[0]).append($cell);
  }

  var ids = [];
  for (var i = 1; i < animatedNotation.rows.length - 1; i++) {
    for (var j = 0; j < intervalMapping[interval].notes.length; j++) {
      $cell = $('<td>').addClass('note_table_cell');
      $cell.on('click', handleNotationCellClick);
      if (document.body.classList.contains('dark_theme_bg_color')) {
        $cell.addClass('white_text_dark_mode');
      }
      $(animatedNotation.rows[i]).append($cell);
      ids.push($(animatedNotation.rows[i]).data('id'));
    }
  }

  for (var l = 0; l < intervalMapping[interval].notes.length; l++) {
    var newNote = {};
    for (var r = 0; r < ids.length; r++) {
      newNote[ids[r]] = '';
    }
    data.push(newNote);
  }

  if ($togglePlaybackElement.is(':disabled')) {
    $togglePlaybackElement.attr('disabled', false);
  }

  barCount++;
}

function handleDeleteBar() {
  if (isPlaying) {
    $togglePlaybackElement.click();
  }
  var animatedNotation = document.getElementById('animated_notation');
  var $cell;
  for (var k = 0; k < intervalMapping[interval].notes.length; k++) {
    animatedNotation.rows[0].deleteCell(-1);
  }

  var ids = [];
  for (var i = 1; i < animatedNotation.rows.length - 1; i++) {
    for (var j = 0; j < intervalMapping[interval].notes.length; j++) {
      animatedNotation.rows[i].deleteCell(-1);
    }
  }

  for (var l = 0; l < intervalMapping[interval].notes.length; l++) {
    data.pop();
  }

  if (animatedNotation.rows[0].cells.length <= FIRST_NOTE_INDEX) {
    $togglePlaybackElement.attr('disabled', true);
  }

  barCount--;
}

function handleDarkModeToggle() {
  document.body.classList.toggle('dark_theme_bg_color');

  if (document.body.classList.contains('dark_theme_bg_color')) {
    settings.dark_mode = true;
    $('#day_icon').css('display', 'none');
    $('#night_icon').css('display', 'inline');
    CANVAS_DRAW_COLOR = WHITE_HEX;
  } else {
    settings.dark_mode = false;
    $('#day_icon').css('display', 'inline');
    $('#night_icon').css('display', 'none');
    CANVAS_DRAW_COLOR = BLACK_HEX;
  }

  document.getElementById('bpm').classList.toggle('white_text_dark_mode');

  var list = document.getElementsByTagName('span');
  for (var i = 0; i < list.length; i++) {
    list[i].classList.toggle('white_text_dark_mode');
  }
  list = document.getElementsByClassName('note_table_cell');
  for (var j = 0; j < list.length; j++) {
    list[j].classList.toggle('white_text_dark_mode');
  }
  list = document.getElementsByClassName('support_dark_theme_text');
  for (var l = 0; l < list.length; l++) {
    list[l].classList.toggle('white_text_dark_mode');
  }
  list = document.getElementsByClassName('support_dark_theme_dropdown');
  for (var k = 0; k < list.length; k++) {
    list[k].classList.toggle('dark_theme_bg_color');
  }
  list = document.getElementsByClassName('support_dark_theme_table');
  for (var s = 0; s < list.length; s++) {
    list[s].classList.toggle('dark_theme_table');
  }

  var animatedNotation = document.getElementById('animated_notation');
  for (var q = 1; q < (animatedNotation.rows.length - 1); q++) {
    var soundGroupId = animatedNotation.rows[q].getAttribute('data-id');
    var canvas = document.getElementById(soundGroupId + '_canvas');
    resetCircle(canvas, data, soundGroupId);
  }

  if (document.getElementsByClassName('cookie_permission')[0].checked) {
    if (settings.dark_mode !== JSON.parse(getCookie(COOKIE_NAME)).dark_mode) {
      setCookie(COOKIE_NAME, JSON.stringify(settings));
    }
  }
}

function initializeInterface() {
  fetchAllSoundFilenames(function() {
    drawVisuals();
    fetchGrooves(function() {
      document.getElementById('spinner').classList.add('hidden');
      document.getElementById('main_content').classList.remove('hidden');
      $togglePlaybackElement.focus();
    });
  });
}

function fetchSounds(soundType, listOfSounds, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'sounds/' + soundType + '/' + soundType + '.html', true);
  xhr.responseType = 'text';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var htmlObject = $(this.response);
      var listItem = htmlObject.find('li a');
      var sounds = [];
      listItem.each(function(){
        sounds.push(this.text);
      });
      for (var i = 0; i < sounds.length; i++) {
        listOfSounds.push(sounds[i].replace('.wav',''));
      }
      soundGroupingsFetched++;
      if (soundGroupingsFetched === expectedSoundGroupings) {
        callback();
      }
    }
  };
  xhr.send();
}

function handleGrooveChange() {
  isPlaying = false;
  Tone.Transport.stop();
  Tone.Transport.clear(loopId);
  colIndex = FIRST_NOTE_INDEX;
  var animatedNotation = document.getElementById('animated_notation');
  animatedNotation.parentNode.removeChild(animatedNotation);
  var circlesTable = document.getElementById('circles_table');
  circlesTable.parentNode.removeChild(circlesTable);
  grooveName = this.text;
  $('#groove_selector').text(grooveName);
  drawVisuals();
  reset();
}

function handlePlaybackToggle() {
  isPlaying = !isPlaying;

  if (!isPlaying) {
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.clear(loopId);
    colIndex = FIRST_NOTE_INDEX;
    var animatedNotation = document.getElementById('animated_notation');
    var numberOfRows = animatedNotation.rows.length;
    var numberOfColumnsInRow = animatedNotation.rows[0].cells.length;
    for (var i = 1; i < (numberOfRows - 1); i++) {
      for (var j = FIRST_NOTE_INDEX; j < numberOfColumnsInRow; j++) {
        var cell = animatedNotation.rows[i].cells[j];
        cell.classList.remove('green_background');
      }
    }
    for (var q = 1; q < (animatedNotation.rows.length - 1); q++) {
      var soundGroupId = animatedNotation.rows[q].getAttribute('data-id');
      var canvas = document.getElementById(soundGroupId + '_canvas');
      resetCircle(canvas, data, soundGroupId);
    }

    reset();
  } else {
    Tone.Transport.bpm.value = parseInt($bpmElement.val());
    Tone.Transport.clear(loopId);
    loopId = Tone.Transport.scheduleRepeat(function(time) {
      stepVisuals(time);
    }, interval);
    Tone.Transport.position = Tone.Time('0:0:0') - Tone.Time('32n');
    Tone.Transport.start();
    $togglePlaybackElement.html('<i class="fas fa-stop"></i> <span>Stop</span>');
    $togglePlaybackElement.removeClass('btn-success');
    $togglePlaybackElement.addClass('btn-danger');
  }

  return false;
}

function reset() {
  document.getElementById('counter').innerHTML = '0:0:0';
  totalCurrentBar = 0;

  $('.member_of_bars').css('display', '');
  $togglePlaybackElement.html('<i class="fas fa-play"></i> <span>Play</span>');
  $togglePlaybackElement.removeClass('btn-danger');
  $togglePlaybackElement.addClass('btn-success');
}

function createCountCell(index, row, notes, count) {
  var $cell = $('<th>').text(notes[count]).addClass('note_table_cell').addClass('bold');
  if (document.body.classList.contains('dark_theme_bg_color')) {
    $cell.addClass('white_text_dark_mode');
  }
  $cell.addClass('member_of_bars');
  var memberOfBar = Math.floor((index / intervalMapping[interval].notes.length) + 1);
  $cell.addClass('member_of_bar_' + memberOfBar).addClass('member_of_bars');
  row.append($cell);
  count++;
  if (count === (notes.length)) {
    count = 0;
  }
  return count;
}

function drawNotationTable() {
  var table = $('<table>').attr('id','animated_notation').addClass('table').addClass('table-bordered').addClass('table-sm').addClass('support_dark_theme_table');

  if (document.body.classList.contains('dark_theme_bg_color')) {
    table.addClass('dark_theme_table');
  }
  var $tableHeader = $('<thead>');
  var $tableHeaderRow = $('<tr>');
  var $span;
  var $header;
  for (var i = 0; i < FIRST_NOTE_INDEX; i++) {
    $header = $('<th>');
    $span = $('<span>');
    if (i === 1) {
      $span.text('Drumkit').addClass('bold');
      if (document.body.classList.contains('dark_theme_bg_color')) {
        $span.addClass('white_text_dark_mode');
      }
      $header.append($span);
    } else if (i === 2) {
      $span.text('Enable').addClass('bold');
      if (document.body.classList.contains('dark_theme_bg_color')) {
        $span.addClass('white_text_dark_mode');
      }
      $header.append($span);
    } else if (i === 3) {
      $span.text('Wheel').addClass('bold');
      if (document.body.classList.contains('dark_theme_bg_color')) {
        $span.addClass('white_text_dark_mode');
      }
      $header.append($span);
    }
    $header.addClass('hideable_column');
    $tableHeaderRow.append($header);
  }

  var count = 0;
  var numberOfNotes = barCount * intervalMapping[interval].notes.length;
  for (var j = 0; j < numberOfNotes; j++) {
    count = createCountCell(j, $tableHeaderRow, intervalMapping[interval].notes, count);
  }
  $tableHeader.append($tableHeaderRow);
  table.append($tableHeader);

  for (var k = 0; k < soundGroupings.length; k++) {
    var id = soundGroupings[k].id;
    var name = soundGroupings[k].name;
    var soundType = soundGroupings[k].sound_type;
    var soundFile = soundGroupings[k].sound_file;
    var $soundGroupRow = createRowForNotationTable(id, name, soundType, soundFile, soundsForEachType[soundType].availableSoundNames, data);
    table.append($soundGroupRow);
  }

  var $row = $('<tr>');
  var $cell = $('<td>');
  var $addSoundGroupElement = $('<button />', {
    id: 'add_sound_group',
    text: '+',
    class: 'btn btn-sm btn-success add_remove_sound_group'
  }).html('<i class="fas fa-plus"></i>');
  $addSoundGroupElement.on('click', handleAddSoundGroupClick);
  $cell.append($addSoundGroupElement);
  $cell.addClass('hideable_column');
  $row.append($cell);
  $cell = $('<td>');

  var $newSoundGroupNameContainer = $('<div>').addClass('md-form').addClass('remove_margin');
  var $input = $('<input>').attr('type', 'text').attr('id', 'new_sound_group_name').addClass('form-control').addClass('remove_margin').addClass('support_dark_theme_text');
  if (document.body.classList.contains('dark_theme_bg_color')) {
    $input.addClass('white_text_dark_mode');
  }
  var $label = $('<label>').attr('for', 'new_sound_group_name').text('Group name').addClass('support_dark_theme_text');
  if (document.body.classList.contains('dark_theme_bg_color')) {
    $label.addClass('white_text_dark_mode');
  }
  $newSoundGroupNameContainer.append($input);
  $newSoundGroupNameContainer.append($label);
  $cell.append($newSoundGroupNameContainer);
  $cell.addClass('hideable_column');
  $row.append($cell);

  var $newSoundGroupTypeContainer = $('<div>').addClass('dropdown').addClass('full_width');
  var $button = $('<button>').addClass('btn').addClass('btn-sm').addClass('btn-primary').addClass('dropdown-toggle').attr('id', 'new_sound_type')
    .data('toggle', 'dropdown').attr('aria-haspopup', 'true').attr('aria-expanded', 'false');
  var $divMenu = $('<div>').addClass('dropdown-menu').attr('id', 'new_sound_type_container').attr('aria-labelledby', 'new_sound_type').addClass('support_dark_theme_dropdown');

  var list = [];
  for (var prop in soundsForEachType) {
    if (Object.prototype.hasOwnProperty.call(soundsForEachType, prop)) {
      var $option = $('<a>').addClass('dropdown-item').attr('href', '#').text(prop.charAt(0).toUpperCase() + prop.slice(1)).addClass('support_dark_theme_text');
      $option.on('click', handleNewSoundTypeClick);
      $divMenu.append($option);
      list.push(prop.charAt(0).toUpperCase() + prop.slice(1));
    }
  }

  $button.text(list[0]);
  $button.addClass('fill_dropdown');
  $newSoundGroupTypeContainer.append($button);
  $newSoundGroupTypeContainer.append($divMenu);

  $row.append($('<td>').addClass('hideable_column'));
  $cell.addClass('hideable_column');
  $cell = $('<td>');
  $cell.addClass('hideable_column');
  $row.append($cell);
  $cell = $('<td>').append($newSoundGroupTypeContainer);
  $cell.addClass('hideable_column');
  $row.append($cell);
  table.append($row);

  $('#pattern').append(table);
  $('.dropdown-toggle').dropdown();
}

function handleNewSoundTypeClick() {
  this.parentNode.parentNode.firstChild.textContent = this.text;
}

function handleAddSoundGroupClick() {
  var newName = document.getElementById('new_sound_group_name').value;
  if (newName !== '') {
    $('#new_sound_group_name').removeClass('red_border');
    var new_sound_group_name = $('#new_sound_group_name').val();
    var new_sound_type = $('#new_sound_type').text().toLowerCase();
    var soundFile = soundsForEachType[new_sound_type].availableSoundNames[0];

    for (var k = 0; k < data.length; k++) {
      data[k][nextAvailableSoundGroupId] = '';
    }

    soundGroupings.push({
      id: nextAvailableSoundGroupId,
      name: new_sound_group_name,
      sound_type: new_sound_type,
      sound_file: soundFile,
      audio: new Tone.Player('sounds/' + new_sound_type + '/' + soundFile + '.wav').toMaster()
    });

    var $row = createRowForNotationTable(nextAvailableSoundGroupId, new_sound_group_name, new_sound_type, soundFile, soundsForEachType[new_sound_type].availableSoundNames, data);
    $('#animated_notation tr:last').before($row);
    $('.dropdown-toggle').dropdown();

    var $cell = drawCircleWithNotes(nextAvailableSoundGroupId, data);
    $cell.addClass('canvas_cell');
    $(document.getElementById('circles_table').rows[0]).append($cell);
    var $label = $('<label>').text(newName).attr('id', nextAvailableSoundGroupId + '_canvas_text').addClass('support_dark_theme_text');

    if (document.body.classList.contains('dark_theme_bg_color')) {
      $label.addClass('white_text_dark_mode');
    }

    $cell = $('<td>').addClass('center_text').append($label);
    $(document.getElementById('circles_table').rows[1]).append($cell);

    document.getElementById('new_sound_group_name').value = '';
    $togglePlaybackElement.focus();
    $(document.getElementById('new_sound_group_name')).blur();
    nextAvailableSoundGroupId++;
  } else {
    $('#new_sound_group_name').addClass('red_border');
  }
}

function createRowForNotationTable(id, name, soundType, soundFile, availableSoundNames, notes) {
  var $row = $('<tr>').attr('data-id', id);
  var $div = $('<div>').addClass('dropdown').addClass('full_width');
  var $button = $('<button>').addClass('btn').addClass('btn-sm').addClass('btn-primary').addClass('dropdown-toggle').attr('id', id + '_sound')
    .data('toggle', 'dropdown').attr('aria-haspopup', 'true').attr('aria-expanded', 'false');
  var $divMenu = $('<div>').addClass('dropdown-menu').attr('id', id + '_sound_list').attr('aria-labelledby', id + '_sound').addClass('support_dark_theme_dropdown');
  if (document.body.classList.contains('dark_theme_bg_color')) {
    $divMenu.toggleClass('dark_theme_bg_color');
  }

  for (var k = 0; k < availableSoundNames.length; k++) {
    var $option = $('<a>').addClass('dropdown-item').attr('href', '#').text(availableSoundNames[k]).addClass('support_dark_theme_text');
    if (document.body.classList.contains('dark_theme_bg_color')) {
      $option.addClass('white_text_dark_mode');
    }
    $option.on('click', handleSoundSampleClick);
    $divMenu.append($option);
  }
  $button.text(soundFile);
  $button.addClass('fill_dropdown');
  $div.append($button);
  $div.append($divMenu);

  var $td = $('<td>').addClass('no_wrap');
  var con = $('<div>').addClass('custom-switch').addClass('custom-control');
  var ind = $('<input>').attr('type', 'checkbox').attr('id', id + '_enabled').addClass('custom-control-input').attr('checked', 'checked');
  var lab = $('<label>').attr('for', id + '_enabled').addClass('custom-control-label');
  con.append(ind);
  con.append(lab);

  var con1 = $('<div>').addClass('custom-switch').addClass('custom-control');
  var ind1 = $('<input>').attr('type', 'checkbox').attr('id', id + '_toggle_canvas').addClass('custom-control-input').attr('checked', 'checked');
  var lab1 = $('<label>').attr('for', id + '_toggle_canvas').addClass('custom-control-label');
  con1.append(ind1);
  con1.append(lab1);

  ind1.on('click', function() {
    if (this.checked) {
      $('#' + id + '_canvas').removeClass('hidden');
      $('#' + id + '_canvas_text').removeClass('hidden');
    } else {
      $('#' + id + '_canvas').addClass('hidden');
      $('#' + id + '_canvas_text').addClass('hidden');
    }
  });

  var $deleteSoundGroupElement = $('<button />', {
    'id': id + '_delete_sound_group',
    'text': TRIGGER_NOTE,
    'class': 'btn btn-sm btn-danger add_remove_sound_group'
  }).html('<i class="fas fa-minus"></i>');
  $deleteSoundGroupElement.on('click', function() {
    for (var k = 0; k < soundGroupings.length; k++) {
      if (soundGroupings[k].id === id) {
        soundGroupings.splice(k, 1);
        break;
      }
    }
    for (var w = 0; w < data.length; w++) {
      delete data[w][id];
    }
    var rowIndex = this.parentNode.parentNode.rowIndex;
    document.getElementById('animated_notation').deleteRow(rowIndex);
    var circlesTable = document.getElementById('circles_table');
    for (var i = 0; i < circlesTable.rows.length; i++) {
      circlesTable.rows[i].deleteCell(rowIndex - 1);
    }
  });


  var $newSoundGroupNameContainer = $('<div>').addClass('md-form').addClass('remove_margin');
  var $input = $('<input>').val(name).attr('type', 'text').addClass('support_dark_theme_text');
  if (document.body.classList.contains('dark_theme_bg_color')) {
    $input.addClass('white_text_dark_mode');
  }

  $newSoundGroupNameContainer.append($input);

  if (document.body.classList.contains('dark_theme_bg_color')) {
    $newSoundGroupNameContainer.addClass('white_text_dark_mode');
  }

  $td = $('<td>').append($deleteSoundGroupElement).addClass('sound_group_input');
  $td.addClass('hideable_column');
  $row.append($td);
  $td = $('<td>').append($newSoundGroupNameContainer).addClass('sound_group_input');
  $td.addClass('hideable_column');
  $row.append($td);
  $td = $('<td>').append(con).addClass('sound_group_input').addClass('center_text');
  $td.addClass('hideable_column');
  $row.append($td);
  $td = $('<td>').append(con1).addClass('sound_group_input').addClass('center_text');
  $td.addClass('hideable_column');
  $row.append($td);

  $td = $('<td>').append($div).addClass('sound_group_input').addClass('min_width_sound');
  $td.addClass('hideable_column');
  $row.append($td);

  var numberOfNotes = barCount * intervalMapping[interval].notes.length;

  for (var i = 0; i < numberOfNotes; i++) {

    if (notes[i] === undefined) {
      notes.push({});
      notes[i][id] = '';
    } else if (notes[i][id] !== '' && notes[i][id] !== TRIGGER_NOTE) {
      notes[i][id] = '';
    }

    var $cell = $('<td>').text(notes[i][id]).addClass('note_table_cell').addClass('playable_note');
    if (document.body.classList.contains('dark_theme_bg_color')) {
      $cell.addClass('white_text_dark_mode');
    }
    $cell.on('click', handleNotationCellClick);
    var memberOfBar = Math.floor((i / intervalMapping[interval].notes.length) + 1);
    $cell.addClass('member_of_bar_' + memberOfBar).addClass('member_of_bars');
    $row.append($cell);
  }

  return $row;
}

function handleSoundSampleClick() {
  this.parentNode.classList.remove('show');
  this.parentNode.parentNode.classList.remove('show');
  this.parentNode.parentNode.firstChild.textContent = this.text;
  var id = this.parentNode.parentNode.parentNode.parentNode.getAttribute('data-id');

  for (var j = 0; j < soundGroupings.length; j++) {
    if (soundGroupings[j].id == id) {
      soundGroupings[j].sound_file = this.text;
      soundGroupings[j].audio = new Tone.Player('sounds/' + soundGroupings[j].sound_type + '/' + this.text + '.wav').toMaster();
      break;
    }
  }
}

function handleNotationCellClick(event) {
  var columnIndex = this.cellIndex;
  var id = this.parentNode.getAttribute('data-id');
  if (columnIndex >= FIRST_NOTE_INDEX) {
    var updatedContent;
    if ($(this).text() === TRIGGER_NOTE) {
      $(this).text('');
      updatedContent = '';
    } else {
      $(this).text(TRIGGER_NOTE);
      updatedContent = TRIGGER_NOTE;
    }
    data[columnIndex - FIRST_NOTE_INDEX][id] = updatedContent;
  }

  if (!isPlaying) {
    var canvas = document.getElementById(id + '_canvas');
    resetCircle(canvas, data, id);
  }

  event.stopPropagation();
}

function drawVisuals() {
  fetchGrooveAndDrawVisuals();
}

function fetchGrooveAndDrawVisuals() {
  var xhr = new XMLHttpRequest();
  var spaceReplacedGrooveName = grooveName.replace(/ /g, '_');
  xhr.open('GET', 'grooves/' + spaceReplacedGrooveName.toLowerCase() + '/' + spaceReplacedGrooveName.toLowerCase() + '.json', true);
  xhr.responseType = 'json';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var json = this.response;
      Tone.Transport.bpm.value = json.bpm;
      $bpmElement.val(json.bpm);
      Tone.Transport.timeSignature = json.time_signature;
      interval = json.interval;
      barCount = json.bar_count;
      $('#interval_button').text(intervalMapping[interval].name);

      soundGroupings = json.sound_groupings;
      for (var j = 0; j < soundGroupings.length; j++) {
        soundGroupings[j].audio = new Tone.Player('sounds/' + soundGroupings[j].sound_type + '/' + soundGroupings[j].sound_file + '.wav').toMaster();
        nextAvailableSoundGroupId++;
      }
      data = json.notes;

      drawNotationTable();
      drawCirclesWithNotes();
      $togglePlaybackElement.attr('disabled', false);
    }
  };
  xhr.send();
}

function drawCirclesWithNotes() {
  var $canvasContainer = $('#canvas_container');
  var $row = $('<tr>');
  var id;
  var $cell;
  for (var i = 0; i < soundGroupings.length; i++) {
    id = soundGroupings[i].id;
    var soundType = soundGroupings[i].sound_type;
    $cell = drawCircleWithNotes(id, data);
    $row.append($cell);
  }
  var $table = $('<table>').attr('id', 'circles_table');
  $table.append($row);

  $row = $('<tr>');
  for (var j = 0; j < soundGroupings.length; j++) {
    var name = soundGroupings[j].name;
    id = soundGroupings[j].id;
    var $label = $('<label>').text(name).attr('id', id + '_canvas_text').addClass('support_dark_theme_text');
    if (document.body.classList.contains('dark_theme_bg_color')) {
      $label.addClass('white_text_dark_mode');
    }
    $label.addClass('larger_text');
    $cell = $('<td>').addClass('center_text').append($label);
    $row.append($cell);
  }
  $table.append($row);

  $canvasContainer.append($table);
}

function drawCircleWithNotes(id, data) {

  var $canvas = $('<canvas/>').attr('id', id + '_canvas');
  var $cell = $('<td>').append($canvas);
  $cell.addClass('canvas_cell');

  var ctx = $canvas[0].getContext('2d');
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawCircle(ctx);
  for (var k = 0 ; k < data.length; k++) {
    if (data[k][id] === TRIGGER_NOTE) {
      var asPer = k / data.length * 100;
      var asAng = asPer / 100 * 359 - 90;
      drawPoint(ctx, asAng, 1, NORMAL_POINT_SIZE, CANVAS_DRAW_COLOR);
    }
  }
  return $cell;
}

function stepVisuals(time) {
  if (isPlaying) {
    var animatedNotationElement = document.getElementById('animated_notation');
    var numberOfColumnsInRow = animatedNotationElement.rows[0].cells.length;
    var barNumber = Math.floor((colIndex - FIRST_NOTE_INDEX) / intervalMapping[interval].notes.length) + 1;

    if (onlyShowActiveBar) {
      $('.member_of_bars').css('display', 'none');
      $('.member_of_bar_' + barNumber).css('display', '');
    }

    removeCurrentNoteIndicator();

    for (var i = 1; i < (animatedNotationElement.rows.length - 1); i++) {
      var soundGroupingId = animatedNotationElement.rows[i].getAttribute('data-id');
      var cell = animatedNotationElement.rows[i].cells[colIndex];
      var enabled = document.getElementById(soundGroupingId + '_enabled').checked;
      cell.classList.add('green_background');

      if (cell.textContent === TRIGGER_NOTE && enabled) {
        try {
          soundGroupings[i - 1].audio.start(time);
        } catch (err) {
          // Audio file may not have been buffered yet
        }
      }

      if (document.getElementById(soundGroupingId + '_toggle_canvas').checked) {
        var canvas = document.getElementById(soundGroupingId + '_canvas');
        stepCircle(canvas, enabled, data, soundGroupingId);
      }
    }

    var countCell = animatedNotationElement.rows[0].cells[colIndex];
    if (countCell.textContent === '1') {
      totalCurrentBar++;
    }
    var quarterNoteNumber = (Math.floor((Tone.Transport.getTicksAtTime(time) / 192)) % 4) + 1;
    document.getElementById('counter').textContent = totalCurrentBar + ':' + barNumber + ':' + quarterNoteNumber;

    colIndex++;
    if (colIndex >= numberOfColumnsInRow) {
      colIndex = FIRST_NOTE_INDEX;
    }
  }
}

function stepCircle(canvas, isEnabled, notes, id) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawCircle(ctx);
  var asPer;
  var asAng;
  if (isEnabled) {
    var adjustedColIndex = colIndex - FIRST_NOTE_INDEX;
    asPer = calculateNumberAsPercentageOfAnother(adjustedColIndex, notes.length);
    asAng = calculateNumberAsAngle(asPer);
    drawPoint(ctx, asAng, 1, LARGE_POINT_SIZE, '#00C851');
  }

  for (var k = 0 ; k < notes.length; k++) {
    if (notes[k][id] === TRIGGER_NOTE) {
      asPer = calculateNumberAsPercentageOfAnother(k, notes.length);
      asAng = calculateNumberAsAngle(asPer);
      drawPoint(ctx, asAng, 1, NORMAL_POINT_SIZE, CANVAS_DRAW_COLOR);
    }
  }
}

function calculateNumberAsPercentageOfAnother(number, percentageOf) {
  return number / percentageOf * 100;
}

function calculateNumberAsAngle(numberAsPercentage) {
  return numberAsPercentage / 100 * 359 - 90;
}

function resetCircle(canvas, notes, id) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawCircle(ctx);

  for (var k = 0 ; k < notes.length; k++) {
    if (notes[k][id] === TRIGGER_NOTE) {
      var asPer = calculateNumberAsPercentageOfAnother(k, notes.length);
      var asAng = calculateNumberAsAngle(asPer);
      drawPoint(ctx, asAng, 1, NORMAL_POINT_SIZE, CANVAS_DRAW_COLOR);
    }
  }
}

function removeCurrentNoteIndicator() {
  $('.playable_note').each(function() {
    this.classList.remove('green_background');
  });
}

function fetchGrooves(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'grooves/grooves.html', true);
  xhr.responseType = 'text';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var htmlObject = $(this.response);
      var grooves = [];
      var listItem = htmlObject.find('li a');
      listItem.each(function() {
        grooves.push(this.text.substring(0, this.text.length - 1));
      });
      $grooveSelectionsElement.children().not(':first-child').remove();
      var $option = $('<a>').addClass('dropdown-item').attr('href', '#').html('Custom<i class="far fa-star float_right"></i>').addClass('support_dark_theme_text');
      $option.on('click', handleGrooveChange);
      $grooveSelectionsElement.append($option);
      $grooveSelectionsElement.append($('<div>').addClass('dropdown-divider'));
      for (var i = 0; i < grooves.length; i++) {
        var spacedString = grooves[i].replace(/_/g, ' ');
        var upperCased = spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
        var htmlContent;
        if (upperCased !== 'Custom') {
          if (upperCased === 'Beat it' || upperCased === 'Billie jean') {
            htmlContent = upperCased + '<i class="fab fa-redhat float_right"></i>';
          } else if (upperCased === 'Master blaster') {
            htmlContent = upperCased + '<i class="fas fa-glasses float_right"></i>';
          } else if (upperCased === 'Highway to hell') {
            htmlContent = upperCased + '<i class="fas fa-bolt float_right"></i>';
          } else {
            htmlContent = upperCased;
          }
          $option = $('<a>').addClass('dropdown-item').attr('href', '#').text(htmlContent).addClass('support_dark_theme_text');
          $option.on('click', handleGrooveChange);
          $grooveSelectionsElement.append($option);
        }
      }

      callback();
    }
  };
  xhr.send();
}

function drawCircle(ctx){
  ctx.beginPath();
  ctx.strokeStyle = CANVAS_DRAW_COLOR;
  ctx.arc(CENTER_X, CENTER_Y, RADIUS, 0, 2 * Math.PI);
  ctx.stroke();
}

function drawPoint(ctx, angle, distance, pointSize, color){
  var x = CENTER_X + RADIUS * Math.cos(angle * Math.PI / 180) * distance;
  var y = CENTER_Y + RADIUS * Math.sin(angle * Math.PI / 180) * distance;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, pointSize, 0, 2 * Math.PI, true);
  ctx.fill();
}

function fetchAllSoundFilenames(callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'sounds/sounds.html', true);
  xhr.responseType = 'text';
  xhr.onload = function(e) {
    if (this.status == 200) {
      var htmlObject = $(this.response);
      var grooves = [];
      var listItem = htmlObject.find('li a');
      var countOfSoundTypes = 0;
      listItem.each(function(){
        var soundType = this.text.substring(0, this.text.length - 1);
        var soundTypeObj = {
          availableSoundNames: []
        };
        soundsForEachType[soundType] = soundTypeObj;
        countOfSoundTypes++;
      });
      expectedSoundGroupings = countOfSoundTypes;
      for (var prop in soundsForEachType) {
        if (Object.prototype.hasOwnProperty.call(soundsForEachType, prop)) {
          fetchSounds(prop, soundsForEachType[prop].availableSoundNames, callback);
        }
      }
    }
  };
  xhr.send();
}

function handleGrooveExport() {
  var tempSoundGroupings = [];
  for (var i = 0; i < soundGroupings.length; i++) {
    var tempSoundGroup = {
      id: soundGroupings[i].id,
      name: soundGroupings[i].name,
      sound_type: soundGroupings[i].sound_type,
      sound_file: soundGroupings[i].sound_file
    };
    tempSoundGroupings.push(tempSoundGroup);
  }

  var output = {
    bpm: $bpmElement.val(),
    time_signature: '4/4',
    interval: interval,
    bar_count: barCount,
    sound_groupings: tempSoundGroupings,
    notes: data
  };
  document.getElementById('export_modal_body').textContent = JSON.stringify(output, null, 2);
  $('#basicExampleModal').modal({});
}

function handleSettings() {
  $('#settings_modal').modal({});
}

function handleGrooveImport() {
  $('#import_groove_modal').modal({});
}

function handleGrooveImportModalClose() {
  var grooveJson = document.getElementById('groove_json_to_import').value;
  var parsedGroove = JSON.parse(grooveJson);
  data = parsedGroove.sound_groupings;

  Tone.Transport.stop();
  Tone.Transport.clear(loopId);
  colIndex = FIRST_NOTE_INDEX;
  var animatedNotation = document.getElementById('animated_notation');
  animatedNotation.parentNode.removeChild(animatedNotation);
  var circlesTable = document.getElementById('circles_table');
  circlesTable.parentNode.removeChild(circlesTable);
  grooveName = 'Custom';
  $('#groove_selector').text(grooveName);
  drawVisuals();
  reset();
  isPlaying = false;
}

function copyToClipboard(text) {
  var $temp = $('<input>');
  $('body').append($temp);
  $temp.val(text).select();
  document.execCommand('copy');
  $temp.remove();
}

function setCookie(name, value, days) {
  var expires = '';
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (value || '')  + expires + '; path=/';
}
function getCookie(name) {
  var nameEQ = name + '=';
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}
